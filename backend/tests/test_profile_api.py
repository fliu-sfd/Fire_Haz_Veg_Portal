import logging
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import FirefighterProfile, ResidentAsset, User, UserRole

pytestmark = pytest.mark.db

PROFILE = "/api/v1/me/profile"
PASSWORD_URL = "/api/v1/me/password"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
COOKIE = settings.auth_cookie_name
PASSWORD = "Wildfire#Safe2026"
NEW_PASSWORD = "Ember&Ridge4471"
PROFILE_FIELDS = {
    "id",
    "full_name",
    "email",
    "phone",
    "role",
    "email_verified",
    "created_at",
    "last_login_at",
    "asset_ids",
    "firefighter",
}


def add_user(db, email, role=UserRole.RESIDENT, *, assets=(), name="Test Person", **fields):
    user = User(
        email=email,
        password_hash=hash_password(PASSWORD),
        full_name=name,
        role=role,
        resident_assets=[ResidentAsset(asset_id=a) for a in assets],
        **fields,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def token_issued_at(user: User, issued_at: datetime) -> str:
    payload = {
        "sub": str(user.id),
        "type": "access",
        "iat": issued_at,
        "exp": datetime.now(UTC) + timedelta(hours=1),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def use_token(client, token: str) -> None:
    # drop any cookie the server set, so only this token is sent
    client.cookies.clear()
    client.cookies.set(COOKIE, token)


def login_as(client, user: User) -> None:
    use_token(client, create_access_token(user.id))


def change(client, current=PASSWORD, new=NEW_PASSWORD):
    return client.post(PASSWORD_URL, json={"current_password": current, "new_password": new})


def error_code(resp) -> str:
    return resp.json()["detail"]["code"]


def error_field(resp) -> str:
    return resp.json()["detail"]["field"]


def loc_fields(resp) -> set[str]:
    return {err["loc"][-1] for err in resp.json()["detail"]}


@pytest.fixture
def resident(db) -> User:
    return add_user(
        db,
        "carlos@example.com",
        assets=["1732983", "1690011"],
        name="Carlos Rivera",
        phone="480-555-0100",
    )


@pytest.fixture
def firefighter(db) -> User:
    user = add_user(db, "frank@example.com", UserRole.FIREFIGHTER, name="Frank Ortiz")
    user.firefighter_profile = FirefighterProfile(employee_id="E100", station_code="616C")
    db.commit()
    return user


@pytest.fixture
def admin(db) -> User:
    return add_user(db, "ava.admin@example.com", UserRole.ADMIN, name="Ava Admin")


@pytest.fixture
def resident_client(client, resident):
    login_as(client, resident)
    return client


# --- access ---


ENDPOINTS = [
    ("get", PROFILE, None),
    ("patch", PROFILE, {"full_name": "New Name"}),
    ("post", PASSWORD_URL, {"current_password": PASSWORD, "new_password": NEW_PASSWORD}),
]


@pytest.mark.parametrize(("method", "path", "body"), ENDPOINTS)
def test_signed_out_gets_401(client, method, path, body) -> None:
    kwargs = {"json": body} if body is not None else {}
    resp = getattr(client, method)(path, **kwargs)
    assert resp.status_code == 401


@pytest.mark.parametrize(("method", "path", "body"), ENDPOINTS)
def test_inactive_user_gets_401(client, db, resident, method, path, body) -> None:
    resident.is_active = False
    db.commit()
    login_as(client, resident)
    kwargs = {"json": body} if body is not None else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401


@pytest.mark.parametrize("who", ["resident", "firefighter", "admin"])
def test_every_role_can_read_own_profile(client, request, who) -> None:
    user = request.getfixturevalue(who)
    login_as(client, user)
    resp = client.get(PROFILE)
    assert resp.status_code == 200
    assert resp.json()["id"] == str(user.id)


@pytest.mark.parametrize("who", ["resident", "firefighter", "admin"])
def test_every_role_can_update_own_profile(client, request, who) -> None:
    login_as(client, request.getfixturevalue(who))
    resp = client.patch(PROFILE, json={"phone": "(480) 555-0199"})
    assert resp.status_code == 200
    assert resp.json()["phone"] == "(480) 555-0199"


@pytest.mark.parametrize("who", ["resident", "firefighter", "admin"])
def test_every_role_can_change_own_password(client, request, who) -> None:
    login_as(client, request.getfixturevalue(who))
    assert change(client).status_code == 204


# --- read ---


def test_resident_profile_shape(resident_client, resident) -> None:
    body = resident_client.get(PROFILE).json()
    assert set(body) == PROFILE_FIELDS
    assert body["full_name"] == "Carlos Rivera"
    assert body["email"] == "carlos@example.com"
    assert body["phone"] == "480-555-0100"
    assert body["role"] == "resident"
    assert body["email_verified"] is False
    assert body["last_login_at"] is None
    assert body["asset_ids"] == ["1690011", "1732983"]
    assert body["firefighter"] is None


def test_profile_never_has_password_hash(resident_client) -> None:
    resp = resident_client.get(PROFILE)
    assert "password" not in resp.text
    assert "argon2" not in resp.text


def test_firefighter_sees_department_details(client, firefighter) -> None:
    login_as(client, firefighter)
    body = client.get(PROFILE).json()
    assert body["firefighter"] == {"employee_id": "E100", "station_code": "616C"}
    assert body["asset_ids"] == []


def test_admin_sees_no_role_details(client, admin) -> None:
    login_as(client, admin)
    body = client.get(PROFILE).json()
    assert body["firefighter"] is None
    assert body["asset_ids"] == []


def test_former_firefighter_does_not_see_old_details(client, db, firefighter) -> None:
    firefighter.role = UserRole.ADMIN
    db.commit()
    login_as(client, firefighter)
    assert client.get(PROFILE).json()["firefighter"] is None


def test_profile_shows_last_sign_in(client, resident) -> None:
    client.post(LOGIN, json={"email": resident.email, "password": PASSWORD})
    assert client.get(PROFILE).json()["last_login_at"] is not None


# --- only your own record ---


def test_each_user_gets_only_their_own_profile(client, resident, firefighter) -> None:
    login_as(client, firefighter)
    assert client.get(PROFILE).json()["id"] == str(firefighter.id)
    login_as(client, resident)
    assert client.get(PROFILE).json()["id"] == str(resident.id)


def test_id_in_query_is_ignored(resident_client, resident, firefighter) -> None:
    resp = resident_client.get(PROFILE, params={"id": str(firefighter.id)})
    assert resp.json()["id"] == str(resident.id)


def test_id_path_does_not_exist(resident_client, firefighter) -> None:
    assert resident_client.get(f"{PROFILE}/{firefighter.id}").status_code in (404, 405)
    resp = resident_client.patch(f"{PROFILE}/{firefighter.id}", json={"full_name": "Hacker Name"})
    assert resp.status_code in (404, 405)


@pytest.mark.parametrize("key", ["id", "user_id"])
def test_id_in_patch_body_is_422(resident_client, firefighter, key) -> None:
    resp = resident_client.patch(PROFILE, json={key: str(firefighter.id), "full_name": "X Name"})
    assert resp.status_code == 422


def test_patch_never_touches_another_user(resident_client, db, firefighter) -> None:
    resident_client.patch(PROFILE, json={"full_name": "Changed Name"})
    db.refresh(firefighter)
    assert firefighter.full_name == "Frank Ortiz"


def test_password_change_never_touches_another_user(resident_client, db, firefighter) -> None:
    old_hash = firefighter.password_hash
    assert change(resident_client).status_code == 204
    db.refresh(firefighter)
    assert firefighter.password_hash == old_hash
    assert firefighter.password_changed_at is None


# --- update ---


def test_update_name_only(resident_client, db, resident) -> None:
    resp = resident_client.patch(PROFILE, json={"full_name": "  Carla   Rivera "})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == PROFILE_FIELDS
    assert body["full_name"] == "Carla Rivera"
    assert body["phone"] == "480-555-0100"
    db.refresh(resident)
    assert resident.full_name == "Carla Rivera"


def test_update_phone_only(resident_client, resident) -> None:
    body = resident_client.patch(PROFILE, json={"phone": "+1 480 555 0123"}).json()
    assert body["phone"] == "+1 480 555 0123"
    assert body["full_name"] == "Carlos Rivera"


def test_update_both(resident_client) -> None:
    body = resident_client.patch(
        PROFILE, json={"full_name": "Carla Rivera", "phone": "480-555-0111"}
    ).json()
    assert (body["full_name"], body["phone"]) == ("Carla Rivera", "480-555-0111")


@pytest.mark.parametrize("phone", [None, "", "   "])
def test_null_or_blank_phone_clears_it(resident_client, db, resident, phone) -> None:
    body = resident_client.patch(PROFILE, json={"phone": phone}).json()
    assert body["phone"] is None
    db.refresh(resident)
    assert resident.phone is None


def test_omitted_phone_is_left_alone(resident_client, db, resident) -> None:
    resident_client.patch(PROFILE, json={"full_name": "Carla Rivera"})
    db.refresh(resident)
    assert resident.phone == "480-555-0100"


def test_name_change_shows_in_auth_me(resident_client) -> None:
    resident_client.patch(PROFILE, json={"full_name": "Carla Rivera"})
    assert resident_client.get(ME).json()["full_name"] == "Carla Rivera"


def test_empty_body_is_422(resident_client) -> None:
    assert resident_client.patch(PROFILE, json={}).status_code == 422


@pytest.mark.parametrize(
    "body",
    [
        {"email": "new@example.com"},
        {"role": "admin"},
        {"is_active": False},
        {"email_verified": True},
        {"asset_ids": ["1"]},
        {"firefighter": {"employee_id": "E1"}},
        {"password": NEW_PASSWORD},
    ],
)
def test_other_fields_are_422(resident_client, db, resident, body) -> None:
    resp = resident_client.patch(PROFILE, json={**body, "full_name": "Carla Rivera"})
    assert resp.status_code == 422
    db.refresh(resident)
    assert resident.full_name == "Carlos Rivera"
    assert resident.role is UserRole.RESIDENT


@pytest.mark.parametrize("name", [None, "", "A", "R2D2", "<script>", "x" * 121])
def test_invalid_name_is_422(resident_client, name) -> None:
    resp = resident_client.patch(PROFILE, json={"full_name": name})
    assert resp.status_code == 422
    assert loc_fields(resp) == {"full_name"}


@pytest.mark.parametrize("phone", ["12345", "480-555-01OO", "1" * 16, "+1 (480) 555-0100 ext 9"])
def test_invalid_phone_is_422(resident_client, phone) -> None:
    resp = resident_client.patch(PROFILE, json={"phone": phone})
    assert resp.status_code == 422
    assert loc_fields(resp) == {"phone"}


def test_update_logs_field_names_not_values(resident_client, resident, caplog) -> None:
    caplog.set_level(logging.INFO, logger="app.services.profile_service")
    resident_client.patch(PROFILE, json={"full_name": "Carla Rivera", "phone": "480-555-0111"})
    messages = [r.getMessage() for r in caplog.records]
    assert messages == [f"user {resident.id} updated own profile: full_name, phone"]
    assert "Carla" not in caplog.text and "0111" not in caplog.text


def test_unchanged_values_write_no_log(resident_client, caplog) -> None:
    caplog.set_level(logging.INFO, logger="app.services.profile_service")
    resp = resident_client.patch(PROFILE, json={"full_name": "Carlos Rivera"})
    assert resp.status_code == 200
    assert caplog.records == []


# --- change password ---


def test_wrong_current_password_is_400(resident_client, db, resident) -> None:
    old_hash = resident.password_hash
    resp = change(resident_client, current="Not-The-Password1")
    assert resp.status_code == 400
    assert resp.json()["detail"] == {
        "code": "wrong_current_password",
        "message": "Your current password is not correct.",
        "field": "current_password",
    }
    db.refresh(resident)
    assert resident.password_hash == old_hash
    assert resident.password_changed_at is None
    # still signed in
    assert resident_client.get(PROFILE).status_code == 200


def test_same_password_is_422(resident_client, db, resident) -> None:
    resp = change(resident_client, new=PASSWORD)
    assert resp.status_code == 422
    assert error_code(resp) == "password_unchanged"
    assert error_field(resp) == "new_password"
    db.refresh(resident)
    assert resident.password_changed_at is None


@pytest.mark.parametrize(
    "weak",
    [
        "Short#1a",
        "alllowercase#2026",
        "ALLUPPERCASE#2026",
        "NoDigitsHere#Now",
        "NoSpecials2026Abc",
        " Leading#Space2026",
        "Long#Pass1" + "x" * 120,
    ],
)
def test_weak_new_password_is_422(resident_client, weak) -> None:
    resp = change(resident_client, new=weak)
    assert resp.status_code == 422
    assert loc_fields(resp) == {"new_password"}


@pytest.mark.parametrize("personal", ["Carlos#Wildfire26", "Rivera#Wildfire26", "xCARLOS!2026yy"])
def test_password_with_name_or_email_is_422(resident_client, db, resident, personal) -> None:
    resp = change(resident_client, new=personal)
    assert resp.status_code == 422
    assert error_code(resp) == "password_personal"
    assert error_field(resp) == "new_password"
    assert resp.json()["detail"]["message"] == "Password must not contain your name or email"
    db.refresh(resident)
    assert resident.password_changed_at is None


def test_personal_check_uses_saved_email(client, db) -> None:
    user = add_user(db, "wildfire.ops@example.com", name="Jo Li")
    login_as(client, user)
    resp = change(client, new="Wildfire.Ops#2026")
    assert error_code(resp) == "password_personal"


@pytest.mark.parametrize(
    "body",
    [
        {"new_password": NEW_PASSWORD},
        {"current_password": "", "new_password": NEW_PASSWORD},
        {"current_password": "x" * 129, "new_password": NEW_PASSWORD},
        {"current_password": PASSWORD},
        {"current_password": PASSWORD, "new_password": NEW_PASSWORD, "user_id": "x"},
    ],
)
def test_bad_password_body_is_422(resident_client, body) -> None:
    assert resident_client.post(PASSWORD_URL, json=body).status_code == 422


def test_change_password_success(client, db, resident) -> None:
    client.post(LOGIN, json={"email": resident.email, "password": PASSWORD})
    resp = change(client)
    assert resp.status_code == 204
    assert resp.content == b""

    set_cookie = resp.headers["set-cookie"]
    assert f"{COOKIE}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert f"Max-Age={settings.access_token_expire_minutes * 60}" in set_cookie

    db.refresh(resident)
    assert verify_password(NEW_PASSWORD, resident.password_hash)
    assert resident.password_changed_at is not None

    client.cookies.clear()
    old = client.post(LOGIN, json={"email": resident.email, "password": PASSWORD})
    assert old.status_code == 401
    new = client.post(LOGIN, json={"email": resident.email, "password": NEW_PASSWORD})
    assert new.status_code == 200


def test_remembered_session_keeps_long_cookie(client, resident) -> None:
    client.post(LOGIN, json={"email": resident.email, "password": PASSWORD, "remember_me": True})
    resp = change(client)
    expected = settings.remembered_access_token_expire_minutes * 60
    assert f"Max-Age={expected}" in resp.headers["set-cookie"]


def test_password_change_logs_without_values(resident_client, resident, caplog) -> None:
    caplog.set_level(logging.INFO, logger="app.services.profile_service")
    change(resident_client)
    messages = [r.getMessage() for r in caplog.records]
    assert messages == [f"user {resident.id} updated own profile: password"]
    assert PASSWORD not in caplog.text and NEW_PASSWORD not in caplog.text


# --- sessions after a password change ---


def test_older_cookie_is_rejected_after_change(client, resident) -> None:
    old_token = token_issued_at(resident, datetime.now(UTC) - timedelta(minutes=5))
    use_token(client, old_token)
    resp = change(client)
    assert resp.status_code == 204

    # this browser got a fresh cookie and stays signed in
    use_token(client, resp.cookies[COOKIE])
    assert client.get(PROFILE).status_code == 200
    assert client.get(ME).status_code == 200

    # another device still holding the old cookie is signed out
    use_token(client, old_token)
    assert client.get(PROFILE).status_code == 401
    assert client.get(ME).status_code == 401


def test_token_from_same_second_is_accepted(client, db, resident) -> None:
    resident.password_changed_at = datetime(2026, 10, 20, 12, 0, 0, 900_000, tzinfo=UTC)
    db.commit()
    use_token(client, token_issued_at(resident, datetime(2026, 10, 20, 12, 0, 0, tzinfo=UTC)))
    assert client.get(ME).status_code == 200


def test_token_from_second_before_is_rejected(client, db, resident) -> None:
    resident.password_changed_at = datetime(2026, 10, 20, 12, 0, 0, 100_000, tzinfo=UTC)
    db.commit()
    use_token(client, token_issued_at(resident, datetime(2026, 10, 20, 11, 59, 59, tzinfo=UTC)))
    assert client.get(ME).status_code == 401


def test_token_after_change_is_accepted(client, db, resident) -> None:
    resident.password_changed_at = datetime.now(UTC) - timedelta(minutes=10)
    db.commit()
    use_token(client, token_issued_at(resident, datetime.now(UTC) - timedelta(minutes=1)))
    assert client.get(ME).status_code == 200


def test_never_changed_password_is_unaffected(client, resident) -> None:
    assert resident.password_changed_at is None
    use_token(client, token_issued_at(resident, datetime(2020, 1, 1, tzinfo=UTC)))
    assert client.get(ME).status_code == 200


def test_token_without_iat_is_rejected(client, resident) -> None:
    payload = {
        "sub": str(resident.id),
        "type": "access",
        "exp": datetime.now(UTC) + timedelta(hours=1),
    }
    use_token(client, jwt.encode(payload, settings.jwt_secret_key, settings.jwt_algorithm))
    assert client.get(ME).status_code == 401


def test_unknown_user_token_is_401(client) -> None:
    use_token(client, create_access_token(uuid.uuid4()))
    assert client.get(PROFILE).status_code == 401
