import uuid
from datetime import UTC, datetime

import pytest

from app.core.config import settings
from app.core.security import create_access_token
from app.models import Assessment, User, UserRole
from app.services import admin_hazard_service

pytestmark = pytest.mark.db

URL = "/api/v1/admin/hazards"
FILTERS_URL = "/api/v1/admin/hazards/filters"
EMPTY_SUMMARY = {"by_state": {"open": 0, "pending_review": 0, "closed": 0}, "needs_attention": 0}
FAKE_HASH = "$argon2id$not-a-real-hash"
ALLOWED_FIELDS = {
    "asset_id",
    "state",
    "property_type",
    "crew_code",
    "inspected_at",
    "comments",
    "site_address",
    "photo_count",
    "age_days",
    "attention_reasons",
    "latitude",
    "longitude",
}


def add_user(db, email, role) -> User:
    user = User(full_name=email.split("@")[0], email=email, password_hash=FAKE_HASH, role=role)
    db.add(user)
    db.commit()
    return user


def add_row(
    db,
    asset,
    *,
    status="ISSUES",
    year=2026,
    lon=-111.9,
    lat=33.7,
    day=1,
    crew="611A",
    site_type="Community",
    **extra,
) -> Assessment:
    row = Assessment(
        season_year=year,
        source_global_id=uuid.uuid4(),
        asset_id=asset,
        status=status,
        crew_code=crew,
        site_type=site_type,
        inspected_at=datetime(year, 6, day, tzinfo=UTC),
        location=None if lon is None else f"SRID=4326;POINT({lon} {lat})",
        **extra,
    )
    db.add(row)
    db.commit()
    return row


def login_as(client, user: User) -> None:
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


@pytest.fixture
def admin(db) -> User:
    return add_user(db, "ava.admin@example.com", UserRole.ADMIN)


@pytest.fixture
def admin_client(client, admin):
    login_as(client, admin)
    return client


@pytest.fixture
def hazards(db) -> None:
    # 1001: two issue points, latest on day 5
    add_row(db, "1001", lon=-111.90, lat=33.70, day=2, crew="611A", comments="old")
    add_row(db, "1001", lon=-111.80, lat=33.80, day=5, crew="612B", comments="Brush to trim")
    add_row(db, "1001", status="NO ISSUES", lon=-111.0, lat=33.0, day=9, crew="699Z")
    # 1002: residential, one point
    add_row(db, "1002", crew="611B", site_type=None, site_address="7 Desert Rd")
    # 1003: crew 613A
    add_row(db, "1003", crew="613A")
    # 1004: no issues anywhere, not a hazard
    add_row(db, "1004", status="NO ISSUES", crew="614A")


def asset_ids(resp) -> list[str]:
    return [i["asset_id"] for i in resp.json()["items"]]


# --- access ---


def test_requires_login(client, hazards) -> None:
    assert client.get(URL).status_code == 401
    assert client.get(FILTERS_URL).status_code == 401


@pytest.mark.parametrize("role", [UserRole.RESIDENT, UserRole.FIREFIGHTER])
def test_non_admins_are_forbidden(client, db, role) -> None:
    login_as(client, add_user(db, f"{role.value}@example.com", role))
    for url in (URL, FILTERS_URL):
        resp = client.get(url)
        assert resp.status_code == 403
        assert resp.json() == {"detail": "Administrator access required"}


def test_deactivated_admin_is_rejected(admin_client, db, admin) -> None:
    admin.is_active = False
    db.commit()
    assert admin_client.get(URL).status_code == 401
    assert admin_client.get(FILTERS_URL).status_code == 401


# --- grouping and shape ---


def test_only_assets_with_issues_appear(admin_client, hazards) -> None:
    body = admin_client.get(URL).json()
    print("hazards ->", body)
    assert body["season_year"] == 2026
    assert body["total"] == 3
    assert asset_ids(admin_client.get(URL)) == ["1001", "1002", "1003"]


def test_items_contain_only_allowed_fields(admin_client, hazards) -> None:
    for item in admin_client.get(URL).json()["items"]:
        assert set(item) == ALLOWED_FIELDS


def test_issue_points_become_one_item_at_their_centroid(admin_client, hazards) -> None:
    item = admin_client.get(URL).json()["items"][0]
    assert item["asset_id"] == "1001"
    assert item["latitude"] == pytest.approx(33.75)
    assert item["longitude"] == pytest.approx(-111.85)
    assert item["crew_code"] == "612B"
    assert item["comments"] == "Brush to trim"
    assert item["inspected_at"].startswith("2026-06-05")
    assert item["state"] == "open"
    assert item["property_type"] == "naos"


def test_latest_non_null_address_is_used(admin_client, db) -> None:
    add_row(db, "2001", day=1, site_address="1 Old Rd")
    add_row(db, "2001", day=2, site_address="2 New Rd")
    add_row(db, "2001", day=3)
    item = admin_client.get(URL).json()["items"][0]
    assert item["site_address"] == "2 New Rd"
    assert item["inspected_at"].startswith("2026-06-03")


def test_same_day_rows_pick_the_same_latest_row_every_time(admin_client, db) -> None:
    add_row(db, "2002", day=4, crew="611A")
    add_row(db, "2002", day=4, crew="611B")
    crews = {admin_client.get(URL).json()["items"][0]["crew_code"] for _ in range(3)}
    assert len(crews) == 1


def test_assets_without_located_issue_points_are_excluded(admin_client, db) -> None:
    add_row(db, "3001", lon=None)
    add_row(db, "3002")
    assert asset_ids(admin_client.get(URL)) == ["3002"]


def test_only_latest_season_is_used(admin_client, db) -> None:
    # the same asset id in two seasons is two different properties
    add_row(db, "1001", year=2025, lon=-112.5, lat=33.0, crew="610A")
    add_row(db, "4001", year=2025, crew="610A")
    add_row(db, "1001", year=2026, lon=-111.9, lat=33.7, crew="611A")
    body = admin_client.get(URL).json()
    assert body["season_year"] == 2026
    assert asset_ids(admin_client.get(URL)) == ["1001"]
    assert body["items"][0]["longitude"] == pytest.approx(-111.9)
    assert admin_client.get(FILTERS_URL).json()["crews"] == ["611A"]


def test_empty_database_returns_empty_shape(admin_client) -> None:
    assert admin_client.get(URL).json() == {
        "season_year": None,
        "total": 0,
        "summary": EMPTY_SUMMARY,
        "items": [],
    }
    assert admin_client.get(FILTERS_URL).json() == {
        "season_year": None,
        "crews": [],
        "property_types": [],
    }


# --- filters ---


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"crew": "612B"}, ["1001"]),
        ({"crew": ["611B", "613A"]}, ["1002", "1003"]),
        # filters use the latest row's crew, the one the map shows
        ({"crew": "611A"}, []),
        ({"property_type": "naos"}, ["1001", "1003"]),
        ({"property_type": "residential"}, ["1002"]),
        ({"state": "open"}, ["1001", "1002", "1003"]),
        ({"state": ["pending_review", "closed"]}, []),
        ({"state": ["open", "closed"]}, ["1001", "1002", "1003"]),
        ({"crew": ["611B", "613A"], "property_type": "naos", "state": "open"}, ["1003"]),
    ],
)
def test_filters(admin_client, hazards, params, expected) -> None:
    resp = admin_client.get(URL, params=params)
    print(params, "->", asset_ids(resp))
    assert resp.status_code == 200
    assert asset_ids(resp) == expected
    assert resp.json()["total"] == len(expected)


@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"state": "fixed"}, "state"),
        ({"property_type": "commercial"}, "property_type"),
        ({"crew": "x" * 17}, "crew"),
        ({"season": "2025"}, "season"),
    ],
)
def test_invalid_params_return_422(admin_client, params, field) -> None:
    resp = admin_client.get(URL, params=params)
    locs = [e["loc"][:2] for e in resp.json()["detail"]]
    print(params, "->", resp.status_code, locs)
    assert resp.status_code == 422
    assert ["query", field] in [list(loc) for loc in locs]


def test_total_counts_past_the_cap(admin_client, hazards, monkeypatch) -> None:
    monkeypatch.setattr(admin_hazard_service, "HAZARD_LIMIT", 2)
    body = admin_client.get(URL).json()
    assert body["total"] == 3
    assert [i["asset_id"] for i in body["items"]] == ["1001", "1002"]


def test_filter_options(admin_client, hazards) -> None:
    body = admin_client.get(FILTERS_URL).json()
    print("filters ->", body)
    assert body == {
        "season_year": 2026,
        "crews": ["611A", "611B", "612B", "613A"],
        "property_types": ["naos", "residential"],
    }


def test_filter_options_ignore_unlocated_types(admin_client, db) -> None:
    add_row(db, "5001")
    add_row(db, "5002", lon=None, site_type=None, crew=None)
    body = admin_client.get(FILTERS_URL).json()
    assert body["crews"] == ["611A"]
    assert body["property_types"] == ["naos"]
