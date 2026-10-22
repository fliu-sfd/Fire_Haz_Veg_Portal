import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import Assessment, ResidentAsset, User, UserRole
from app.services.property_service import (
    can_view_assessment,
    link_user_to_property,
    list_user_properties,
    resolve_property,
)

pytestmark = pytest.mark.db

SIGNUP = "/api/v1/auth/signup"
MINE = "/api/v1/residents/me/properties"
FAKE_HASH = "$argon2id$not-a-real-hash"
PASSWORD = "Wildfire#Safe2026"


def add_assessment(db, asset_id, status="NO ISSUES", year=2026, when=None, address=None):
    row = Assessment(
        season_year=year,
        source_global_id=uuid.uuid4(),
        asset_id=asset_id,
        status=status,
        inspected_at=when,
        site_address=address,
    )
    db.add(row)
    db.flush()
    return row


def add_user(db, email, role=UserRole.RESIDENT, assets=()):
    user = User(
        email=email,
        password_hash=FAKE_HASH,
        full_name="Test Person",
        role=role,
        resident_assets=[ResidentAsset(asset_id=a) for a in assets],
    )
    db.add(user)
    db.flush()
    return user


def sign_in(client, user):
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


# ---- resolve_property -------------------------------------------------------------


def test_resolve_returns_the_stored_id(db):
    add_assessment(db, "1732983")
    assert resolve_property(db, "1732983") == "1732983"


def test_resolve_ignores_spaces_and_letter_case(db):
    add_assessment(db, "AB-12")
    assert resolve_property(db, "  ab-12 ") == "AB-12"


@pytest.mark.parametrize("bad", ["", "   ", None, "nope"])
def test_resolve_gives_none_for_blank_or_unknown(db, bad):
    add_assessment(db, "1732983")
    assert resolve_property(db, bad) is None


# ---- signup ---------------------------------------------------------------------------


def signup_body(asset_id):
    return {
        "full_name": "Jane Doe",
        "email": "jane.doe@example.com",
        "asset_id": asset_id,
        "password": PASSWORD,
    }


def test_valid_id_creates_account_and_link(client, db):
    add_assessment(db, "1732983")
    db.commit()

    resp = client.post(SIGNUP, json=signup_body("1732983"))
    print("signup:", resp.status_code, resp.json())

    assert resp.status_code == 201
    assert resp.json()["property_ids"] == ["1732983"]
    assert db.scalar(select(func.count()).select_from(ResidentAsset)) == 1


def test_unknown_id_is_refused_and_leaves_no_user(client, db):
    add_assessment(db, "1732983")
    db.commit()

    resp = client.post(SIGNUP, json=signup_body("0000000"))
    assert resp.status_code == 404
    assert resp.json()["detail"]["field"] == "asset_id"
    assert db.scalar(select(func.count()).select_from(User)) == 0


def test_blank_id_is_refused(client, db):
    resp = client.post(SIGNUP, json=signup_body("   "))
    assert resp.status_code == 422
    assert db.scalar(select(func.count()).select_from(User)) == 0


# ---- linking twice -------------------------------------------------------------------


def test_same_user_and_asset_are_linked_only_once(db):
    add_assessment(db, "1001")
    user = add_user(db, "one@example.com")

    first = link_user_to_property(db, user, "1001")
    second = link_user_to_property(db, user, "1001")

    assert first.id == second.id
    count = db.scalar(
        select(func.count()).select_from(ResidentAsset).where(ResidentAsset.user_id == user.id)
    )
    assert count == 1


def test_one_user_can_link_several_assets_and_one_asset_several_users(db):
    for asset in ("1001", "1002"):
        add_assessment(db, asset)
    hoa = add_user(db, "hoa@example.com")
    family = add_user(db, "family@example.com")
    link_user_to_property(db, hoa, "1001")
    link_user_to_property(db, hoa, "1002")
    link_user_to_property(db, family, "1001")

    assert [p.asset_id for p in list_user_properties(db, hoa)] == ["1001", "1002"]
    assert [p.asset_id for p in list_user_properties(db, family)] == ["1001"]


# ---- can_view_assessment ---------------------------------------------------------------


def test_linked_resident_can_view_but_another_resident_cannot(db):
    mine = add_assessment(db, "1001")
    other = add_assessment(db, "2002")
    owner = add_user(db, "owner@example.com", assets=["1001"])
    stranger = add_user(db, "stranger@example.com", assets=["2002"])

    assert can_view_assessment(db, owner, mine) is True
    assert can_view_assessment(db, stranger, mine) is False
    assert can_view_assessment(db, owner, other) is False


def test_linked_resident_can_view_every_season_of_their_asset(db):
    old = add_assessment(db, "1001", year=2025)
    new = add_assessment(db, "1001", year=2026)
    owner = add_user(db, "owner@example.com", assets=["1001"])
    assert can_view_assessment(db, owner, old) and can_view_assessment(db, owner, new)


def test_resident_with_no_links_cannot_view_anything(db):
    row = add_assessment(db, "1001")
    nobody = add_user(db, "nobody@example.com")
    assert can_view_assessment(db, nobody, row) is False


@pytest.mark.parametrize("role", [UserRole.FIREFIGHTER, UserRole.ADMIN])
def test_staff_can_view_any_assessment(db, role):
    row = add_assessment(db, "1001")
    staff = add_user(db, f"{role.value}@example.com", role=role)
    assert can_view_assessment(db, staff, row) is True


# ---- GET /residents/me/properties -----------------------------------------------------------


def test_route_lists_only_my_properties_with_latest_result(client, db):
    add_assessment(db, "1001", "NO ISSUES", year=2025, when=datetime(2025, 6, 1, tzinfo=UTC))
    add_assessment(
        db, "1001", "ISSUES", year=2026, when=datetime(2026, 6, 1, tzinfo=UTC), address="1 Elm Rd"
    )
    add_assessment(db, "2002", "NO ISSUES")
    me = add_user(db, "me@example.com", assets=["1001"])
    add_user(db, "someone.else@example.com", assets=["2002"])
    db.commit()
    sign_in(client, me)

    resp = client.get(MINE)
    body = resp.json()
    print("mine:", resp.status_code, body)

    assert resp.status_code == 200
    assert [p["asset_id"] for p in body] == ["1001"]
    assert body[0]["latest_status"] == "ISSUES"
    assert body[0]["season_year"] == 2026
    assert body[0]["latest_inspected_at"].startswith("2026-06-01")
    assert body[0]["site_address"] == "1 Elm Rd"


def test_route_shows_a_link_whose_assessments_are_gone(client, db):
    me = add_user(db, "me@example.com", assets=["9999"])
    db.commit()
    sign_in(client, me)
    body = client.get(MINE).json()
    assert body == [
        {
            "asset_id": "9999",
            "season_year": None,
            "latest_status": None,
            "latest_inspected_at": None,
            "site_address": None,
        }
    ]


def test_route_returns_empty_list_for_resident_with_no_links(client, db):
    me = add_user(db, "me@example.com")
    db.commit()
    sign_in(client, me)
    assert client.get(MINE).json() == []


@pytest.mark.parametrize("role", [UserRole.FIREFIGHTER, UserRole.ADMIN])
def test_route_is_forbidden_for_staff(client, db, role):
    staff = add_user(db, f"{role.value}@example.com", role=role)
    db.commit()
    sign_in(client, staff)
    assert client.get(MINE).status_code == 403


def test_route_needs_a_signed_in_user(client):
    assert client.get(MINE).status_code == 401
