import pytest
from sqlalchemy import func, select

from app.core.security import verify_password
from app.models import ResidentAsset, ResidentProfile, User

pytestmark = pytest.mark.db

URL = "/api/v1/auth/signup"
PASSWORD = "Wildfire#Safe2026"


def payload(**overrides) -> dict:
    body = {
        "full_name": "  Jane   Doe ",
        "email": "Jane.Doe@Example.com",
        "password": PASSWORD,
    }
    body.update(overrides)
    return body


def test_signup_creates_resident_with_no_properties(client, db) -> None:
    resp = client.post(URL, json=payload())
    body = resp.json()
    print("signup ->", resp.status_code, body)

    assert resp.status_code == 201
    assert body["email"] == "jane.doe@example.com"
    assert body["full_name"] == "Jane Doe"
    assert body["phone"] is None
    assert body["role"] == "resident"
    assert body["property_ids"] == []
    assert body["id"] and body["created_at"]
    assert not {"password", "confirm_password", "password_hash"} & body.keys()

    user = db.scalar(select(User).where(User.email == "jane.doe@example.com"))
    assert user is not None
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)
    assert db.scalar(select(func.count()).select_from(ResidentAsset)) == 0
    assert db.scalar(select(func.count()).select_from(ResidentProfile)) == 0
    assert "HttpOnly" in resp.headers["set-cookie"]


def test_duplicate_email_any_case_returns_409(client, db) -> None:
    assert client.post(URL, json=payload()).status_code == 201

    resp = client.post(URL, json=payload(email="JANE.DOE@example.COM"))
    print("dup ->", resp.status_code, resp.json())
    assert resp.status_code == 409
    assert resp.json()["detail"] == "An account with this email already exists."


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"password": "weakpass", "confirm_password": "weakpass"}, "password"),
        ({"full_name": "J"}, "full_name"),
        ({"email": "not-an-email"}, "email"),
        ({"role": "admin"}, "role"),
        ({"asset_id": "A-1001"}, "asset_id"),
        ({"property_address": "7575 E Main St"}, "property_address"),
    ],
)
def test_invalid_signup_returns_422(client, db, overrides: dict, field: str) -> None:
    resp = client.post(URL, json=payload(**overrides))
    errors = resp.json()["detail"]
    print(field, "->", resp.status_code, [(e["loc"], e["msg"]) for e in errors])

    assert resp.status_code == 422
    assert ["body", field] in [e["loc"] for e in errors]
    assert db.scalar(select(User)) is None


@pytest.mark.parametrize("role", ["resident", "admin", "firefighter"])
def test_signup_rejects_any_sent_role(client, db, role: str) -> None:
    resp = client.post(URL, json=payload(role=role))
    assert resp.status_code == 422
    assert db.scalar(select(User)) is None
