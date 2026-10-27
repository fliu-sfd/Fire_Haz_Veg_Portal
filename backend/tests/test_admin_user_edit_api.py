import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models import Assessment, FirefighterProfile, ResidentAsset, User, UserRole

pytestmark = pytest.mark.db

USERS = "/api/v1/admin/users"
FAKE_HASH = "$argon2id$not-a-real-hash"
PASSWORD = "Wildfire#Safe2026"
DETAIL_FIELDS = {
    "id",
    "full_name",
    "email",
    "phone",
    "role",
    "is_active",
    "email_verified",
    "created_at",
    "last_login_at",
    "asset_ids",
    "firefighter",
}


def add_user(db, email, role=UserRole.RESIDENT, *, assets=(), name="Test Person", **fields):
    user = User(
        email=email,
        password_hash=fields.pop("password_hash", FAKE_HASH),
        full_name=name,
        role=role,
        resident_assets=[ResidentAsset(asset_id=a) for a in assets],
        **fields,
    )
    db.add(user)
    db.commit()
    return user


def add_assessment(db, asset_id):
    db.add(
        Assessment(
            season_year=2026, source_global_id=uuid.uuid4(), asset_id=asset_id, status="ISSUES"
        )
    )
    db.commit()


def login_as(client, user: User) -> None:
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


def url(user: User | uuid.UUID) -> str:
    return f"{USERS}/{user if isinstance(user, uuid.UUID) else user.id}"


def error_code(resp) -> str:
    return resp.json()["detail"]["code"]


@pytest.fixture
def admin(db) -> User:
    return add_user(db, "ava.admin@example.com", UserRole.ADMIN, name="Ava Admin")


@pytest.fixture
def resident(db) -> User:
    return add_user(
        db, "carlos@example.com", assets=["1732983"], name="Carlos Rivera", phone="480-555-0100"
    )


@pytest.fixture
def firefighter(db) -> User:
    user = add_user(db, "frank@example.com", UserRole.FIREFIGHTER, name="Frank Ortiz")
    user.firefighter_profile = FirefighterProfile(employee_id="E100", station_code="616C")
    db.commit()
    return user


@pytest.fixture
def admin_client(client, admin):
    login_as(client, admin)
    return client


# --- access ---


ENDPOINTS = [
    ("get", "", None),
    ("patch", "", {"full_name": "New Name"}),
    ("post", "/assets", {"asset_id": "1732983"}),
    ("delete", "/assets/1732983", None),
]


@pytest.mark.parametrize(("method", "suffix", "body"), ENDPOINTS)
@pytest.mark.parametrize("who", [None, "resident", "firefighter"])
def test_admin_only(client, resident, firefighter, method, suffix, body, who) -> None:
    expected = 401
    if who is not None:
        login_as(client, resident if who == "resident" else firefighter)
        expected = 403
    kwargs = {"json": body} if body is not None else {}
    resp = client.request(method, url(resident) + suffix, **kwargs)
    assert resp.status_code == expected


# --- detail ---


def test_detail_shape(admin_client, resident) -> None:
    resp = admin_client.get(url(resident))
    body = resp.json()
    assert resp.status_code == 200
    assert set(body) == DETAIL_FIELDS
    assert "password" not in resp.text
    assert body["asset_ids"] == ["1732983"]
    assert body["phone"] == "480-555-0100"
    assert body["is_active"] is True and body["email_verified"] is False
    assert body["last_login_at"] is None and body["firefighter"] is None


def test_detail_firefighter(admin_client, firefighter) -> None:
    body = admin_client.get(url(firefighter)).json()
    assert body["firefighter"] == {"employee_id": "E100", "station_code": "616C"}
    assert body["asset_ids"] == []


def test_detail_unknown_user(admin_client) -> None:
    resp = admin_client.get(url(uuid.uuid4()))
    assert resp.status_code == 404
    assert resp.json()["detail"] == {
        "code": "user_not_found",
        "message": "This user no longer exists.",
    }


def test_detail_bad_id_is_422(admin_client) -> None:
    assert admin_client.get(f"{USERS}/not-a-uuid").status_code == 422


# --- update: fields ---


@pytest.mark.parametrize(
    ("body", "field", "expected"),
    [
        ({"full_name": "  Carla   Rivera "}, "full_name", "Carla Rivera"),
        ({"email": " Carla@Example.COM "}, "email", "carla@example.com"),
        ({"phone": " (480)  555-0199 "}, "phone", "(480) 555-0199"),
        ({"phone": "+1 480 555 0199"}, "phone", "+1 480 555 0199"),
        ({"is_active": False}, "is_active", False),
    ],
)
def test_update_one_field(admin_client, db, resident, body, field, expected) -> None:
    resp = admin_client.patch(url(resident), json=body)
    assert resp.status_code == 200, resp.json()
    assert resp.json()[field] == expected
    db.refresh(resident)
    assert getattr(resident, field) == expected


def test_update_several_fields(admin_client, resident) -> None:
    resp = admin_client.patch(
        url(resident),
        json={"full_name": "Carla Rivera", "email": "carla@example.com", "phone": None},
    )
    body = resp.json()
    assert resp.status_code == 200
    assert (body["full_name"], body["email"], body["phone"]) == (
        "Carla Rivera",
        "carla@example.com",
        None,
    )


def test_phone_null_clears_and_omitted_keeps(admin_client, resident) -> None:
    kept = admin_client.patch(url(resident), json={"full_name": "Carla Rivera"}).json()
    assert kept["phone"] == "480-555-0100"
    cleared = admin_client.patch(url(resident), json={"phone": None}).json()
    assert cleared["phone"] is None


def test_unchanged_values_are_accepted(admin_client, resident) -> None:
    resp = admin_client.patch(url(resident), json={"full_name": "Carlos Rivera"})
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Carlos Rivera"


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"password": "Another#Pass2026"},
        {"role": "superuser"},
        {"full_name": None},
        {"email": None},
        {"is_active": None},
        {"email": "not-an-email"},
        {"full_name": "R2D2"},
        {"phone": "555-0100"},
        {"phone": "480-555-0100 ext 5"},
        {"phone": "1" * 21},
        {"role": "firefighter", "firefighter": {"employee_id": "E 1"}},
        {"role": "firefighter", "firefighter": {"employee_id": "E1", "station_code": "x" * 17}},
        {"role": "firefighter", "firefighter": {"employee_id": "E1", "rank": "captain"}},
    ],
)
def test_invalid_body_is_422(admin_client, resident, body) -> None:
    resp = admin_client.patch(url(resident), json=body)
    assert resp.status_code == 422


def test_update_unknown_user(admin_client) -> None:
    resp = admin_client.patch(url(uuid.uuid4()), json={"full_name": "Nobody Here"})
    assert resp.status_code == 404
    assert error_code(resp) == "user_not_found"


# --- update: email ---


def test_email_taken_ignores_case(admin_client, resident, firefighter) -> None:
    resp = admin_client.patch(url(resident), json={"email": "FRANK@example.com"})
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "email_taken"
    assert resp.json()["detail"]["field"] == "email"


def test_own_current_email_is_not_a_conflict(admin_client, resident) -> None:
    resp = admin_client.patch(url(resident), json={"email": "Carlos@Example.com"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "carlos@example.com"


# --- update: own access and last admin ---


@pytest.fixture
def second_admin(db) -> User:
    return add_user(db, "ben.admin@example.com", UserRole.ADMIN, name="Ben Admin")


@pytest.mark.parametrize("body", [{"role": "resident"}, {"is_active": False}])
def test_admin_cannot_change_own_access(admin_client, admin, second_admin, body) -> None:
    resp = admin_client.patch(url(admin), json=body)
    assert resp.status_code == 409
    assert error_code(resp) == "cannot_change_own_access"


def test_admin_can_edit_own_details(admin_client, admin) -> None:
    resp = admin_client.patch(
        url(admin), json={"full_name": "Ava Adams", "role": "admin", "is_active": True}
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Ava Adams"


@pytest.mark.parametrize("body", [{"role": "resident"}, {"is_active": False}])
def test_last_active_admin_is_protected(admin_client, admin, body) -> None:
    resp = admin_client.patch(url(admin), json=body)
    assert resp.status_code == 409
    assert error_code(resp) == "last_admin"


@pytest.mark.parametrize("body", [{"role": "resident"}, {"is_active": False}])
def test_other_admin_can_lose_access(admin_client, second_admin, body) -> None:
    resp = admin_client.patch(url(second_admin), json=body)
    assert resp.status_code == 200
    resp = admin_client.patch(url(second_admin), json={"role": "admin", "is_active": True})
    assert resp.status_code == 200


def test_inactive_admin_does_not_count(admin_client, db, admin) -> None:
    add_user(db, "old.admin@example.com", UserRole.ADMIN, is_active=False)
    resp = admin_client.patch(url(admin), json={"is_active": False})
    assert error_code(resp) == "last_admin"


# --- update: effect on the edited user ---


def test_deactivated_user_is_locked_out(admin_client, client, db) -> None:
    user = add_user(db, "dana@example.com", password_hash=hash_password(PASSWORD))
    assert admin_client.patch(url(user), json={"is_active": False}).status_code == 200

    login_as(client, user)
    assert client.get("/api/v1/auth/me").status_code == 401
    client.cookies.clear()
    resp = client.post("/api/v1/auth/login", json={"email": user.email, "password": PASSWORD})
    assert resp.status_code == 403


# --- update: role and firefighter fields ---


def test_resident_to_firefighter_needs_employee_id(admin_client, db) -> None:
    user = add_user(db, "erin@example.com")
    resp = admin_client.patch(url(user), json={"role": "firefighter"})
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "firefighter_details_required"
    assert resp.json()["detail"]["field"] == "firefighter.employee_id"

    resp = admin_client.patch(
        url(user),
        json={
            "role": "firefighter",
            "firefighter": {"employee_id": " e-200 ", "station_code": "617a"},
        },
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "firefighter"
    assert resp.json()["firefighter"] == {"employee_id": "E-200", "station_code": "617A"}


def test_resident_with_links_cannot_become_staff(admin_client, resident) -> None:
    for role in ("firefighter", "admin"):
        body = {"role": role}
        if role == "firefighter":
            body["firefighter"] = {"employee_id": "E300"}
        resp = admin_client.patch(url(resident), json=body)
        assert resp.status_code == 409
        assert error_code(resp) == "unlink_assets_first"

    assert admin_client.delete(f"{url(resident)}/assets/1732983").status_code == 200
    resp = admin_client.patch(url(resident), json={"role": "admin"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


def test_employee_id_taken(admin_client, db, firefighter) -> None:
    user = add_user(db, "erin@example.com")
    resp = admin_client.patch(
        url(user), json={"role": "firefighter", "firefighter": {"employee_id": "e100"}}
    )
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "employee_id_taken"
    assert resp.json()["detail"]["field"] == "firefighter.employee_id"


def test_firefighter_can_keep_own_employee_id(admin_client, firefighter) -> None:
    resp = admin_client.patch(
        url(firefighter), json={"firefighter": {"employee_id": "E100", "station_code": None}}
    )
    assert resp.status_code == 200
    assert resp.json()["firefighter"] == {"employee_id": "E100", "station_code": None}


def test_firefighter_fields_for_non_firefighter(admin_client, resident, firefighter) -> None:
    resp = admin_client.patch(url(resident), json={"firefighter": {"employee_id": "E400"}})
    assert resp.status_code == 422
    assert error_code(resp) == "firefighter_not_applicable"

    resp = admin_client.patch(
        url(firefighter), json={"role": "admin", "firefighter": {"employee_id": "E100"}}
    )
    assert resp.status_code == 422
    assert error_code(resp) == "firefighter_not_applicable"


def test_firefighter_profile_is_kept_and_reused(admin_client, db, firefighter) -> None:
    resp = admin_client.patch(url(firefighter), json={"role": "admin"})
    assert resp.status_code == 200
    assert db.get(FirefighterProfile, firefighter.id) is not None

    # no details needed on the way back: the old profile is reused
    resp = admin_client.patch(url(firefighter), json={"role": "firefighter"})
    assert resp.status_code == 200
    assert resp.json()["firefighter"] == {"employee_id": "E100", "station_code": "616C"}

    resp = admin_client.patch(url(firefighter), json={"firefighter": {"employee_id": "E101"}})
    assert resp.json()["firefighter"] == {"employee_id": "E101", "station_code": None}


def test_firefighter_without_profile_can_edit_name(admin_client, db) -> None:
    user = add_user(db, "gus@example.com", UserRole.FIREFIGHTER)
    resp = admin_client.patch(url(user), json={"full_name": "Gus Grant"})
    assert resp.status_code == 200


# --- asset links ---


def test_link_asset(admin_client, db, resident) -> None:
    add_assessment(db, "2045117")
    resp = admin_client.post(f"{url(resident)}/assets", json={"asset_id": " 2045117 "})
    assert resp.status_code == 200
    assert resp.json()["asset_ids"] == ["1732983", "2045117"]


def test_link_uses_stored_spelling(admin_client, db, resident) -> None:
    add_assessment(db, "NAOS-77B")
    resp = admin_client.post(f"{url(resident)}/assets", json={"asset_id": "naos-77b"})
    assert resp.json()["asset_ids"] == ["1732983", "NAOS-77B"]


def test_repeat_link_is_a_no_op(admin_client, db, resident) -> None:
    add_assessment(db, "1732983")
    resp = admin_client.post(f"{url(resident)}/assets", json={"asset_id": "1732983"})
    assert resp.status_code == 200
    assert resp.json()["asset_ids"] == ["1732983"]


def test_link_unknown_asset(admin_client, resident) -> None:
    resp = admin_client.post(f"{url(resident)}/assets", json={"asset_id": "0000000"})
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "property_not_found"
    assert resp.json()["detail"]["field"] == "asset_id"


@pytest.mark.parametrize("body", [{}, {"asset_id": ""}, {"asset_id": "x" * 33}, {"x": "1"}])
def test_link_invalid_body(admin_client, resident, body) -> None:
    assert admin_client.post(f"{url(resident)}/assets", json=body).status_code == 422


def test_links_are_residents_only(admin_client, db, firefighter) -> None:
    add_assessment(db, "2045117")
    resp = admin_client.post(f"{url(firefighter)}/assets", json={"asset_id": "2045117"})
    assert resp.status_code == 409
    assert error_code(resp) == "assets_residents_only"
    resp = admin_client.delete(f"{url(firefighter)}/assets/2045117")
    assert error_code(resp) == "assets_residents_only"


def test_link_unknown_user(admin_client) -> None:
    resp = admin_client.post(f"{url(uuid.uuid4())}/assets", json={"asset_id": "1"})
    assert resp.status_code == 404
    assert error_code(resp) == "user_not_found"


def test_unlink_asset(admin_client, resident) -> None:
    resp = admin_client.delete(f"{url(resident)}/assets/1732983")
    assert resp.status_code == 200
    assert resp.json()["asset_ids"] == []
    again = admin_client.delete(f"{url(resident)}/assets/1732983")
    assert again.status_code == 200
    assert again.json()["asset_ids"] == []


# --- list additions ---


def test_list_has_status_fields_and_filter(admin_client, db, resident) -> None:
    add_user(db, "off@example.com", is_active=False)
    items = admin_client.get(USERS).json()["items"]
    assert all({"is_active", "last_login_at"} <= set(i) for i in items)

    inactive = admin_client.get(USERS, params={"is_active": "false"}).json()
    assert [i["email"] for i in inactive["items"]] == ["off@example.com"]
    active = admin_client.get(USERS, params={"is_active": "true"}).json()
    assert active["total"] == 2


@pytest.mark.parametrize("order", ["asc", "desc"])
def test_last_login_sort_puts_never_signed_in_last(admin_client, db, admin, order) -> None:
    now = datetime.now(UTC)
    add_user(db, "early@example.com", last_login_at=now - timedelta(days=2))
    add_user(db, "late@example.com", last_login_at=now - timedelta(days=1))
    add_user(db, "never@example.com")
    resp = admin_client.get(USERS, params={"sort": "last_login_at", "order": order})
    emails = [i["email"] for i in resp.json()["items"]]
    signed_in = ["early@example.com", "late@example.com"]
    assert emails[:2] == (signed_in if order == "asc" else signed_in[::-1])
    assert set(emails[2:]) == {"never@example.com", admin.email}


def test_sort_by_status(admin_client, db) -> None:
    add_user(db, "off@example.com", is_active=False)
    emails = [
        i["email"]
        for i in admin_client.get(USERS, params={"sort": "is_active", "order": "asc"}).json()[
            "items"
        ]
    ]
    assert emails[0] == "off@example.com"
