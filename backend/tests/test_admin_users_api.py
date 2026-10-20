from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.core.security import create_access_token
from app.models import ResidentAsset, User, UserRole

pytestmark = pytest.mark.db

URL = "/api/v1/admin/users"
FAKE_HASH = "$argon2id$not-a-real-hash"
ALLOWED_FIELDS = {"id", "full_name", "email", "role", "asset_ids", "created_at"}
BASE_TIME = datetime(2026, 10, 1, tzinfo=UTC)

# (full name, email, role, asset ids, days after BASE_TIME)
PEOPLE = [
    ("Ava Admin", "ava.admin@example.com", UserRole.ADMIN, [], 0),
    ("Carlos Rivera", "carlos.rivera@example.com", UserRole.RESIDENT, ["1732983"], 1),
    ("Beth Nguyen", "beth.nguyen@example.com", UserRole.RESIDENT, ["2045117"], 2),
    (
        "Desert Ridge HOA",
        "board@desertridge.example",
        UserRole.RESIDENT,
        ["1733002", "1732991", "1732984"],
        3,
    ),
    ("Frank Ortiz", "frank.ortiz@example.com", UserRole.FIREFIGHTER, [], 4),
    ("dana_lee", "dana%lee@example.com", UserRole.RESIDENT, ["9087766"], 5),
]


def add_user(db, full_name, email, role, asset_ids=(), days=0) -> User:
    user = User(
        full_name=full_name,
        email=email,
        password_hash=FAKE_HASH,
        role=role,
        created_at=BASE_TIME + timedelta(days=days),
        resident_assets=[ResidentAsset(asset_id=a) for a in asset_ids],
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def people(db) -> dict[str, User]:
    return {p[1]: add_user(db, *p) for p in PEOPLE}


def login_as(client, user: User) -> None:
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


@pytest.fixture
def admin_client(client, people):
    login_as(client, people["ava.admin@example.com"])
    return client


def names(resp) -> list[str]:
    return [item["full_name"] for item in resp.json()["items"]]


# --- access ---


def test_requires_login(client, people) -> None:
    resp = client.get(URL)
    assert resp.status_code == 401


@pytest.mark.parametrize("email", ["carlos.rivera@example.com", "frank.ortiz@example.com"])
def test_non_admins_are_forbidden(client, people, email) -> None:
    login_as(client, people[email])
    resp = client.get(URL)
    print(email, "->", resp.status_code, resp.json())
    assert resp.status_code == 403
    assert resp.json() == {"detail": "Administrator access required"}


def test_forbidden_before_validation(client, people) -> None:
    # a non-admin learns nothing about the endpoint, not even which params are valid
    login_as(client, people["carlos.rivera@example.com"])
    assert client.get(URL, params={"limit": 0, "sort": "nope"}).status_code == 403


def test_deactivated_admin_is_rejected(admin_client, db, people) -> None:
    people["ava.admin@example.com"].is_active = False
    db.commit()
    assert admin_client.get(URL).status_code == 401


# --- response shape ---


def test_admin_gets_all_users_with_only_allowed_fields(admin_client) -> None:
    resp = admin_client.get(URL)
    body = resp.json()
    print("list ->", body["total"], names(resp))

    assert resp.status_code == 200
    assert body["total"] == len(PEOPLE)
    assert body["limit"] == 25 and body["offset"] == 0
    for item in body["items"]:
        assert set(item) == ALLOWED_FIELDS


def test_community_account_returns_all_asset_ids_sorted(admin_client) -> None:
    item = admin_client.get(URL, params={"q": "desert ridge"}).json()["items"][0]
    assert item["asset_ids"] == ["1732984", "1732991", "1733002"]


def test_staff_have_no_asset_ids(admin_client) -> None:
    items = admin_client.get(URL, params={"role": "firefighter"}).json()["items"]
    assert [i["asset_ids"] for i in items] == [[]]


def test_default_order_is_newest_first(admin_client) -> None:
    assert names(admin_client.get(URL))[0] == "dana_lee"


# --- search ---


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("carlos", ["Carlos Rivera"]),  # name
        ("RIVERA", ["Carlos Rivera"]),  # case-insensitive
        ("beth.nguyen@", ["Beth Nguyen"]),  # email
        ("@desertridge", ["Desert Ridge HOA"]),
        ("1732991", ["Desert Ridge HOA"]),  # any of several asset ids
        ("17329", ["Carlos Rivera", "Desert Ridge HOA"]),  # partial asset id
        ("  carlos   rivera ", ["Carlos Rivera"]),  # extra spaces collapsed
        ("nobody-matches", []),
    ],
)
def test_search(admin_client, q, expected) -> None:
    resp = admin_client.get(URL, params={"q": q, "sort": "full_name", "order": "asc"})
    assert names(resp) == expected
    assert resp.json()["total"] == len(expected)


@pytest.mark.parametrize(("q", "expected"), [("%", ["dana_lee"]), ("_", ["dana_lee"])])
def test_search_wildcards_are_literal(admin_client, q, expected) -> None:
    assert names(admin_client.get(URL, params={"q": q})) == expected


def test_blank_search_returns_everyone(admin_client) -> None:
    assert admin_client.get(URL, params={"q": "   "}).json()["total"] == len(PEOPLE)


# --- role filter ---


@pytest.mark.parametrize(("role", "count"), [("resident", 4), ("firefighter", 1), ("admin", 1)])
def test_role_filter(admin_client, role, count) -> None:
    body = admin_client.get(URL, params={"role": role}).json()
    assert body["total"] == count
    assert {i["role"] for i in body["items"]} == {role}


def test_search_and_role_filter_combine(admin_client) -> None:
    resp = admin_client.get(URL, params={"q": "example.com", "role": "firefighter"})
    assert names(resp) == ["Frank Ortiz"]


# --- sort ---


@pytest.mark.parametrize(
    ("sort", "expected_asc"),
    [
        (
            "full_name",
            [
                "Ava Admin",
                "Beth Nguyen",
                "Carlos Rivera",
                "dana_lee",
                "Desert Ridge HOA",
                "Frank Ortiz",
            ],
        ),
        (
            "email",
            [
                "Ava Admin",
                "Beth Nguyen",
                "Desert Ridge HOA",
                "Carlos Rivera",
                "dana_lee",
                "Frank Ortiz",
            ],
        ),
        (
            "created_at",
            [
                "Ava Admin",
                "Carlos Rivera",
                "Beth Nguyen",
                "Desert Ridge HOA",
                "Frank Ortiz",
                "dana_lee",
            ],
        ),
    ],
)
def test_sort_both_directions(admin_client, sort, expected_asc) -> None:
    asc = names(admin_client.get(URL, params={"sort": sort, "order": "asc"}))
    desc = names(admin_client.get(URL, params={"sort": sort, "order": "desc"}))
    print(sort, "asc ->", asc)
    assert asc == expected_asc
    assert desc == list(reversed(expected_asc))


def test_sort_by_role_is_alphabetical(admin_client) -> None:
    resp = admin_client.get(URL, params={"sort": "role", "order": "asc"})
    roles = [i["role"] for i in resp.json()["items"]]
    assert roles == sorted(roles)
    assert roles[0] == "admin" and roles[-1] == "resident"


def test_sort_by_asset_ids_puts_users_without_assets_last(admin_client) -> None:
    for order in ("asc", "desc"):
        resp = admin_client.get(URL, params={"sort": "asset_ids", "order": order})
        got = names(resp)
        print(order, "->", got)
        assert set(got[-2:]) == {"Ava Admin", "Frank Ortiz"}
    asc = names(admin_client.get(URL, params={"sort": "asset_ids", "order": "asc"}))
    # lowest asset id per user: 1732983, 1732984, 2045117, 9087766
    assert asc[:4] == ["Carlos Rivera", "Desert Ridge HOA", "Beth Nguyen", "dana_lee"]


def test_ties_are_stable_across_pages(admin_client, db) -> None:
    for i in range(5):
        add_user(db, "Same Name", f"same{i}@example.com", UserRole.RESIDENT)
    params = {"q": "same", "sort": "full_name", "limit": 2}
    seen = []
    for offset in (0, 2, 4):
        seen += [
            i["email"]
            for i in admin_client.get(URL, params={**params, "offset": offset}).json()["items"]
        ]
    assert sorted(seen) == [f"same{i}@example.com" for i in range(5)]


# --- paging ---


def test_paging(admin_client) -> None:
    params = {"sort": "full_name", "order": "asc", "limit": 4}
    first = admin_client.get(URL, params={**params, "offset": 0}).json()
    second = admin_client.get(URL, params={**params, "offset": 4}).json()
    assert first["total"] == second["total"] == len(PEOPLE)
    assert len(first["items"]) == 4 and len(second["items"]) == 2
    assert {i["id"] for i in first["items"]}.isdisjoint(i["id"] for i in second["items"])


def test_offset_past_end_is_empty(admin_client) -> None:
    body = admin_client.get(URL, params={"offset": 100}).json()
    assert body["items"] == [] and body["total"] == len(PEOPLE)


# --- validation ---


@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"limit": 0}, "limit"),
        ({"limit": 101}, "limit"),
        ({"offset": -1}, "offset"),
        ({"sort": "password_hash"}, "sort"),
        ({"order": "sideways"}, "order"),
        ({"role": "homeowner"}, "role"),
        ({"q": "x" * 101}, "q"),
        ({"include": "phone"}, "include"),
    ],
)
def test_invalid_params_return_422(admin_client, params, field) -> None:
    resp = admin_client.get(URL, params=params)
    print(params, "->", resp.status_code, [e["loc"] for e in resp.json()["detail"]])
    assert resp.status_code == 422
    assert ["query", field] in [e["loc"] for e in resp.json()["detail"]]
