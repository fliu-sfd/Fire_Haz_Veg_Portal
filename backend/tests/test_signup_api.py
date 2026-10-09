import pytest
from sqlalchemy import select

from app.core.security import verify_password
from app.models import User

pytestmark = pytest.mark.db

URL = "/api/v1/auth/signup"
PASSWORD = "Wildfire#Safe2026"


def payload(**overrides) -> dict:
    body = {
        "full_name": "  Jane   Doe ",
        "email": "Jane.Doe@Example.com",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
        "phone": "(480) 555-1234",
    }
    body.update(overrides)
    return body


def test_signup_creates_resident(client, db) -> None:
    resp = client.post(URL, json=payload())
    body = resp.json()
    print("signup ->", resp.status_code, body)

    assert resp.status_code == 201
    assert body["email"] == "jane.doe@example.com"
    assert body["full_name"] == "Jane Doe"
    assert body["phone"] == "+14805551234"
    assert body["role"] == "resident"
    assert body["id"] and body["created_at"]
    assert not {"password", "confirm_password", "password_hash"} & body.keys()

    user = db.scalar(select(User).where(User.email == "jane.doe@example.com"))
    assert user is not None
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)


def test_signup_without_phone(client) -> None:
    body = payload()
    del body["phone"]
    resp = client.post(URL, json=body)
    assert resp.status_code == 201
    assert resp.json()["phone"] is None


def test_duplicate_email_any_case_returns_409(client) -> None:
    assert client.post(URL, json=payload()).status_code == 201

    resp = client.post(URL, json=payload(email="JANE.DOE@example.COM"))
    print("dup ->", resp.status_code, resp.json())
    assert resp.status_code == 409
    assert resp.json()["detail"] == "An account with this email already exists."


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"password": "weakpass", "confirm_password": "weakpass"}, "password"),
        ({"confirm_password": "Wildfire#Safe2027"}, "confirm_password"),
        ({"phone": "123"}, "phone"),
        ({"full_name": "J"}, "full_name"),
        ({"email": "not-an-email"}, "email"),
        ({"role": "admin"}, "role"),
    ],
)
def test_invalid_signup_returns_422(client, db, overrides: dict, field: str) -> None:
    resp = client.post(URL, json=payload(**overrides))
    errors = resp.json()["detail"]
    print(field, "->", resp.status_code, [(e["loc"], e["msg"]) for e in errors])

    assert resp.status_code == 422
    assert ["body", field] in [e["loc"] for e in errors]
    assert db.scalar(select(User)) is None
