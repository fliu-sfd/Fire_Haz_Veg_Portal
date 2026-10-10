import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models import User, UserRole

pytestmark = pytest.mark.db

LOGIN = "/api/v1/auth/login"
LOGOUT = "/api/v1/auth/logout"
ME = "/api/v1/auth/me"
COOKIE = settings.auth_cookie_name
EMAIL = "jane.doe@example.com"
PASSWORD = "Wildfire#Safe2026"


@pytest.fixture
def user(db) -> User:
    u = User(
        email=EMAIL,
        password_hash=hash_password(PASSWORD),
        full_name="Jane Doe",
        role=UserRole.RESIDENT,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def login(client, email=EMAIL, password=PASSWORD):
    return client.post(LOGIN, json={"email": email, "password": password})


def test_login_sets_httponly_cookie_and_returns_user(client, db, user) -> None:
    resp = login(client, email="  JANE.DOE@Example.com ")
    body = resp.json()
    set_cookie = resp.headers["set-cookie"]
    print("login ->", resp.status_code, body, "\nset-cookie:", set_cookie)

    assert resp.status_code == 200
    assert body["id"] == str(user.id)
    assert body["email"] == EMAIL
    assert body["role"] == "resident"
    assert not {"password", "password_hash", "access_token"} & body.keys()

    assert f"{COOKIE}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()
    assert "Path=/" in set_cookie
    assert f"Max-Age={settings.access_token_expire_minutes * 60}" in set_cookie

    db.refresh(user)
    assert user.last_login_at is not None


def test_wrong_password_and_unknown_email_get_same_401(client, user) -> None:
    wrong = login(client, password="Wildfire#Safe2027")
    unknown = login(client, email="nobody@example.com")
    print("wrong ->", wrong.json(), "| unknown ->", unknown.json())

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Invalid email or password"}
    assert "set-cookie" not in wrong.headers


def test_password_is_case_sensitive(client, user) -> None:
    assert login(client, password=PASSWORD.lower()).status_code == 401


def test_inactive_user_gets_403_only_with_correct_password(client, db, user) -> None:
    user.is_active = False
    db.commit()

    assert login(client, password="Wildfire#Safe2027").status_code == 401
    resp = login(client)
    print("inactive ->", resp.status_code, resp.json())
    assert resp.status_code == 403
    assert "disabled" in resp.json()["detail"]
    assert "set-cookie" not in resp.headers


def test_invalid_login_payload_returns_422(client) -> None:
    resp = client.post(LOGIN, json={"email": "not-an-email", "password": ""})
    locs = [e["loc"] for e in resp.json()["detail"]]
    assert resp.status_code == 422
    assert ["body", "email"] in locs
    assert ["body", "password"] in locs


def test_me_returns_logged_in_user(client, user) -> None:
    login(client)
    resp = client.get(ME)
    assert resp.status_code == 200
    assert resp.json()["email"] == EMAIL


def test_me_without_cookie_is_401(client) -> None:
    resp = client.get(ME)
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Not authenticated"}


def _token(sub: str, *, minutes: int = 5, secret: str | None = None, type_: str = "access"):
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": sub, "type": type_, "iat": now, "exp": now + timedelta(minutes=minutes)},
        secret or settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


@pytest.mark.parametrize(
    "make_token",
    [
        lambda u: "garbage",
        lambda u: _token(str(u.id), minutes=-1),  # expired
        lambda u: _token(str(u.id), secret="some-other-secret-that-is-long-enough"),  # forged
        lambda u: _token(str(u.id), type_="refresh"),
        lambda u: _token("not-a-uuid"),
        lambda u: _token(str(uuid.uuid4())),  # user doesn't exist
    ],
    ids=["garbage", "expired", "wrong-secret", "wrong-type", "bad-sub", "unknown-user"],
)
def test_me_rejects_bad_tokens(client, user, make_token) -> None:
    client.cookies.set(COOKIE, make_token(user))
    assert client.get(ME).status_code == 401


def test_me_rejects_user_deactivated_after_login(client, db, user) -> None:
    login(client)
    user.is_active = False
    db.commit()
    assert client.get(ME).status_code == 401


def test_logout_clears_cookie(client, user) -> None:
    login(client)
    assert client.get(ME).status_code == 200

    resp = client.post(LOGOUT)
    print("logout set-cookie:", resp.headers.get("set-cookie"))
    assert resp.status_code == 204
    assert f'{COOKIE}=""' in resp.headers["set-cookie"]
    assert "Max-Age=0" in resp.headers["set-cookie"]
    assert client.get(ME).status_code == 401


def test_logout_when_not_logged_in_is_fine(client) -> None:
    assert client.post(LOGOUT).status_code == 204


def test_token_from_create_access_token_works(client, user) -> None:
    client.cookies.set(COOKIE, create_access_token(user.id))
    assert client.get(ME).status_code == 200
