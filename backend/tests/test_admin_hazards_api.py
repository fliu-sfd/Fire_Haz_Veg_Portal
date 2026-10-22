import uuid
from datetime import UTC, date, datetime

import pytest

from app.core.config import settings
from app.core.security import create_access_token
from app.models import Assessment, CrewPhoto, User, UserRole
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
        inspected_at=extra.pop("inspected_at", datetime(year, 6, day, tzinfo=UTC)),
        location=None if lon is None else f"SRID=4326;POINT({lon} {lat})",
        **extra,
    )
    db.add(row)
    db.commit()
    return row


def add_photos(db, row: Assessment, count: int = 1) -> None:
    for i in range(count):
        db.add(
            CrewPhoto(
                assessment_id=row.id,
                source_global_id=uuid.uuid4(),
                file_name=f"IMG_{i}.jpg",
                content_type="image/jpeg",
                size_bytes=2048,
                storage_key=f"crew/{row.id}/{uuid.uuid4()}.jpg",
            )
        )
    db.commit()


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


# --- search ---


@pytest.fixture
def addresses(db) -> None:
    add_row(db, "1686017", site_address="7 Desert Rd")
    add_row(db, "2045117", site_address="12 Pinnacle Peak Way")
    add_row(db, "50_1", site_address="100% Saguaro Ln")
    add_row(db, "5001")


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("16860", ["1686017"]),  # asset id
        ("pinnacle PEAK", ["2045117"]),  # address, any case
        ("  desert   rd ", ["1686017"]),  # spaces collapsed
        ("%", ["50_1"]),  # literal percent
        ("_", ["50_1"]),  # literal underscore
        ("nothing-matches", []),
    ],
)
def test_search(admin_client, addresses, q, expected) -> None:
    resp = admin_client.get(URL, params={"q": q})
    print(repr(q), "->", asset_ids(resp))
    assert asset_ids(resp) == expected


def test_blank_search_is_ignored(admin_client, addresses) -> None:
    assert admin_client.get(URL, params={"q": "   "}).json()["total"] == 4


# --- inspected date ---


def test_date_bounds_are_inclusive(admin_client, db) -> None:
    for day in (9, 10, 11, 12):
        add_row(db, f"60{day}", inspected_at=datetime(2026, 6, day, 19, 0, tzinfo=UTC))
    params = {"inspected_from": "2026-06-10", "inspected_to": "2026-06-11"}
    assert asset_ids(admin_client.get(URL, params=params)) == ["6010", "6011"]


def test_dates_use_phoenix_days(admin_client, db) -> None:
    # 06:30 UTC on June 10 is 23:30 on June 9 in Phoenix; 07:05 UTC is 00:05 on June 10
    add_row(db, "late", inspected_at=datetime(2026, 6, 10, 6, 30, tzinfo=UTC))
    add_row(db, "early", inspected_at=datetime(2026, 6, 10, 7, 5, tzinfo=UTC))
    assert asset_ids(admin_client.get(URL, params={"inspected_to": "2026-06-09"})) == ["late"]
    assert asset_ids(admin_client.get(URL, params={"inspected_from": "2026-06-10"})) == ["early"]


def test_date_bound_excludes_hazards_without_a_time(admin_client, db) -> None:
    add_row(db, "7001", inspected_at=None)
    add_row(db, "7002")
    assert asset_ids(admin_client.get(URL)) == ["7001", "7002"]
    assert asset_ids(admin_client.get(URL, params={"inspected_from": "2026-01-01"})) == ["7002"]


@pytest.mark.parametrize(
    "params",
    [
        {"inspected_from": "2026-06-11", "inspected_to": "2026-06-10"},
        {"inspected_from": "2026-6-1"},
        {"inspected_from": "2026-02-30"},
        {"inspected_to": "1717200000"},
        {"inspected_to": "2026-06-01T00:00:00"},
        {"q": "x" * 101},
        {"has_photo": "maybe"},
        {"needs_attention": "sometimes"},
    ],
)
def test_bad_new_params_return_422(admin_client, params) -> None:
    resp = admin_client.get(URL, params=params)
    print(params, "->", resp.status_code)
    assert resp.status_code == 422


# --- photos, attention and age ---


@pytest.fixture
def evidence(db) -> None:
    # 8001: photos on two issue points (2 + 1) and one on a NO ISSUES row, with a comment
    first = add_row(db, "8001", day=2, comments="Trim brush")
    second = add_row(db, "8001", day=3, lon=-111.8, comments="Trim brush")
    cleared = add_row(db, "8001", status="NO ISSUES", day=4)
    add_photos(db, first, 2)
    add_photos(db, second, 1)
    add_photos(db, cleared, 5)
    # 8002: photo, no comment
    add_photos(db, add_row(db, "8002"), 1)
    # 8003: comment, no photo
    add_row(db, "8003", comments="Dead palm fronds")
    # 8004: neither
    add_row(db, "8004")


def items_by_asset(resp) -> dict[str, dict]:
    return {item["asset_id"]: item for item in resp.json()["items"]}


def test_photo_count_sums_issue_rows_only(admin_client, evidence) -> None:
    items = items_by_asset(admin_client.get(URL))
    print({a: i["photo_count"] for a, i in items.items()})
    assert {a: i["photo_count"] for a, i in items.items()} == {
        "8001": 3,
        "8002": 1,
        "8003": 0,
        "8004": 0,
    }
    # one marker per asset even with several photos joined in
    assert len(items) == 4
    for item in items.values():
        assert set(item) == ALLOWED_FIELDS


def test_attention_reasons(admin_client, evidence) -> None:
    items = items_by_asset(admin_client.get(URL))
    assert {a: i["attention_reasons"] for a, i in items.items()} == {
        "8001": [],
        "8002": ["no_comment"],
        "8003": ["no_photo"],
        "8004": ["no_photo", "no_comment"],
    }


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, ["8001", "8002", "8003", "8004"]),
        ({"has_photo": "true"}, ["8001", "8002"]),
        ({"has_photo": "false"}, ["8003", "8004"]),
        ({"needs_attention": "true"}, ["8002", "8003", "8004"]),
        ({"needs_attention": "false"}, ["8001"]),
        ({"has_photo": "true", "needs_attention": "true"}, ["8002"]),
    ],
)
def test_photo_and_attention_filters(admin_client, evidence, params, expected) -> None:
    assert asset_ids(admin_client.get(URL, params=params)) == expected


def test_age_days(admin_client, db, monkeypatch) -> None:
    monkeypatch.setattr(admin_hazard_service, "today_in_reporting_zone", lambda: date(2026, 6, 20))
    add_row(db, "9001", inspected_at=datetime(2026, 6, 8, 19, 0, tzinfo=UTC))
    # 03:00 UTC on June 20 is still June 19 in Phoenix
    add_row(db, "9002", inspected_at=datetime(2026, 6, 20, 3, 0, tzinfo=UTC))
    add_row(db, "9003", inspected_at=datetime(2026, 7, 4, 19, 0, tzinfo=UTC))
    add_row(db, "9004", inspected_at=None)
    ages = {a: i["age_days"] for a, i in items_by_asset(admin_client.get(URL)).items()}
    assert ages == {"9001": 12, "9002": 1, "9003": 0, "9004": None}


# --- summary ---


def test_summary_state_counts_ignore_the_state_filter(admin_client, evidence) -> None:
    body = admin_client.get(URL, params={"state": "closed"}).json()
    print("summary ->", body["summary"])
    assert body["total"] == 0
    assert body["summary"]["by_state"] == {"open": 4, "pending_review": 0, "closed": 0}
    assert body["summary"]["needs_attention"] == 0


def test_summary_attention_ignores_its_own_filter(admin_client, evidence) -> None:
    body = admin_client.get(URL, params={"needs_attention": "false"}).json()
    assert body["total"] == 1
    assert body["summary"]["needs_attention"] == 3
    assert body["summary"]["by_state"]["open"] == 1


def test_summary_applies_the_other_filters(admin_client, evidence) -> None:
    body = admin_client.get(URL, params={"has_photo": "false"}).json()
    assert body["summary"] == {
        "by_state": {"open": 2, "pending_review": 0, "closed": 0},
        "needs_attention": 2,
    }


def test_summary_counts_past_the_cap(admin_client, evidence, monkeypatch) -> None:
    monkeypatch.setattr(admin_hazard_service, "HAZARD_LIMIT", 1)
    body = admin_client.get(URL).json()
    assert len(body["items"]) == 1
    assert body["total"] == 4
    assert body["summary"]["by_state"]["open"] == 4
    assert body["summary"]["needs_attention"] == 3


def test_combined_new_filters(admin_client, db) -> None:
    hit = add_row(db, "9101", crew="613A", site_address="3 Ridge Rd", day=15)
    add_photos(db, hit)
    add_row(db, "9102", crew="613A", site_address="4 Ridge Rd", day=15)
    add_row(db, "9103", crew="611A", site_address="5 Ridge Rd", day=15)
    add_row(db, "9104", crew="613A", site_address="6 Ridge Rd", day=2)
    params = {
        "q": "ridge",
        "crew": "613A",
        "inspected_from": "2026-06-10",
        "has_photo": "true",
        "state": "open",
    }
    assert asset_ids(admin_client.get(URL, params=params)) == ["9101"]
