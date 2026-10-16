import uuid

import pytest
from sqlalchemy import select

from app.core.security import verify_password
from app.models import Assessment, ResidentAsset, User

pytestmark = pytest.mark.db

URL = "/api/v1/auth/signup"
PASSWORD = "Wildfire#Safe2026"


def payload(**overrides) -> dict:
    body = {
        "full_name": "  Jane   Doe ",
        "email": "Jane.Doe@Example.com",
        "property_address": "7575 E Main St, Scottsdale, AZ 85251",
        "asset_id": "a-1001",
        "password": PASSWORD,
    }
    body.update(overrides)
    return body


def add_assessment(db, asset_id="A-1001", address="7575 E Main St, Scottsdale, AZ 85251"):
    db.add(
        Assessment(
            season_year=2026,
            source_global_id=uuid.uuid4(),
            asset_id=asset_id,
            status="ISSUES",
            site_address=address,
        )
    )
    db.commit()


def test_signup_creates_resident_and_verified_asset_link(client, db) -> None:
    add_assessment(db)
    resp = client.post(URL, json=payload())
    body = resp.json()
    print("signup ->", resp.status_code, body)

    assert resp.status_code == 201
    assert body["email"] == "jane.doe@example.com"
    assert body["full_name"] == "Jane Doe"
    assert body["phone"] is None
    assert body["role"] == "resident"
    assert body["property_ids"] == ["A-1001"]
    assert body["id"] and body["created_at"]
    assert not {"password", "confirm_password", "password_hash"} & body.keys()

    user = db.scalar(select(User).where(User.email == "jane.doe@example.com"))
    assert user is not None
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)
    assert user.resident_profile.street_address == "7575 E Main St, Scottsdale, AZ 85251"
    link = db.scalar(select(ResidentAsset).where(ResidentAsset.user_id == user.id))
    assert link.asset_id == "A-1001"
    assert "HttpOnly" in resp.headers["set-cookie"]


def test_duplicate_email_any_case_returns_409(client, db) -> None:
    add_assessment(db)
    assert client.post(URL, json=payload()).status_code == 201

    resp = client.post(URL, json=payload(email="JANE.DOE@example.COM"))
    print("dup ->", resp.status_code, resp.json())
    assert resp.status_code == 409
    assert resp.json()["detail"] == "An account with this email already exists."


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"password": "weakpass", "confirm_password": "weakpass"}, "password"),
        ({"property_address": ""}, "property_address"),
        ({"asset_id": "invalid id"}, "asset_id"),
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


def test_signup_rejects_unmatched_address_and_asset(client, db) -> None:
    add_assessment(db)
    resp = client.post(URL, json=payload(property_address="9999 E Other St"))
    assert resp.status_code == 404
    assert resp.json()["detail"] == {
        "code": "property_not_found",
        "message": "We could not match that address and Asset ID.",
        "field": "asset_id",
    }
    assert db.scalar(select(User)) is None


def test_signup_tolerates_address_formatting_differences(client, db) -> None:
    add_assessment(db, address="7575 E. Main St., Scottsdale AZ 85251")
    resp = client.post(URL, json=payload(property_address="7575 e main st scottsdale, az 85251"))
    assert resp.status_code == 201
