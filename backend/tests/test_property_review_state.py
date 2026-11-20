import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.core.security import create_access_token
from app.models import Assessment, ResidentAsset, Submission, User, UserRole
from app.services.review_state import property_review_state

pytestmark = pytest.mark.db

MINE = "/api/v1/residents/me/properties"
MAP = "/api/v1/admin/hazards"
NOW = datetime(2026, 11, 4, 12, 0, tzinfo=UTC)


def add_point(db, asset, result="ISSUES", year=2026):
    row = Assessment(
        season_year=year,
        source_global_id=uuid.uuid4(),
        asset_id=asset,
        status=result,
        crew_code="611A",
        inspected_at=NOW,
        location="SRID=4326;POINT(-111.9 33.7)",
    )
    db.add(row)
    db.flush()
    return row


def add_evidence(db, point, *statuses):
    """One submission per status, oldest first, so the last one is the latest."""
    for step, state in enumerate(statuses):
        db.add(
            Submission(
                assessment_id=point.id,
                status=state,
                created_at=NOW - timedelta(hours=len(statuses) - step),
            )
        )
    db.flush()
    db.refresh(point)


def add_user(db, email, role=UserRole.RESIDENT, assets=()):
    user = User(
        email=email,
        password_hash="not-a-real-hash",
        full_name="Test Person",
        role=role,
        resident_assets=[ResidentAsset(asset_id=a) for a in assets],
    )
    db.add(user)
    db.flush()
    return user


def sign_in(client, user):
    client.cookies.clear()
    client.cookies.set(settings.auth_cookie_name, create_access_token(user.id))


# Each case: the evidence on each issue point of one property, and what the property counts as.
CASES = [
    pytest.param([[]], "open", id="no evidence yet"),
    pytest.param([["pending_review"]], "pending_review", id="photos submitted"),
    pytest.param([["approved"]], "closed", id="approved"),
    pytest.param([["pending_review", "rejected"]], "open", id="sent back"),
    pytest.param(
        [["rejected", "pending_review"]], "pending_review", id="sent back then resubmitted"
    ),
    pytest.param([["pending_review", "approved"]], "closed", id="approved after the first try"),
    pytest.param([["approved"], []], "open", id="one approved, one untouched"),
    pytest.param([["approved"], ["pending_review"]], "pending_review", id="pending beats approved"),
    pytest.param([[], ["pending_review"]], "pending_review", id="pending beats open"),
    pytest.param([["approved"], ["approved"]], "closed", id="every issue approved"),
    pytest.param([["approved"], ["rejected"]], "open", id="one sent back"),
]


@pytest.mark.parametrize(("evidence", "expected"), CASES)
def test_state_of_a_property_from_its_points(db, evidence, expected):
    points = []
    for statuses in evidence:
        point = add_point(db, "R-1")
        add_evidence(db, point, *statuses)
        points.append(point)

    assert property_review_state(points) == expected


def test_a_property_without_issue_points_has_no_state(db):
    clean = add_point(db, "R-2", result="NO ISSUES")
    assert property_review_state([clean]) is None
    assert property_review_state([]) is None


def test_evidence_on_a_clean_point_is_ignored(db):
    issue = add_point(db, "R-3")
    clean = add_point(db, "R-3", result="NO ISSUES")
    add_evidence(db, clean, "approved")
    assert property_review_state([issue, clean]) == "open"


@pytest.mark.parametrize(("evidence", "expected"), CASES)
def test_property_list_shows_the_same_state_as_the_map(client, db, evidence, expected):
    for statuses in evidence:
        add_evidence(db, add_point(db, "R-4"), *statuses)
    owner = add_user(db, "owner.r4@example.com", assets=["R-4"])
    boss = add_user(db, "boss.r4@example.com", UserRole.ADMIN)
    db.commit()

    sign_in(client, owner)
    shown = client.get(MINE).json()[0]["review_state"]
    sign_in(client, boss)
    on_map = client.get(MAP).json()["items"][0]["state"]

    print("card:", shown, "map:", on_map)
    assert shown == on_map == expected


def test_property_list_covers_each_linked_property(client, db):
    add_evidence(db, add_point(db, "L-1"), "pending_review")
    add_evidence(db, add_point(db, "L-2"), "approved")
    add_point(db, "L-3", result="NO ISSUES")
    owner = add_user(db, "owner.l@example.com", assets=["L-1", "L-2", "L-3", "L-4"])
    db.commit()
    sign_in(client, owner)

    shown = {p["asset_id"]: p["review_state"] for p in client.get(MINE).json()}
    # L-4 is linked but has no assessment data at all
    assert shown == {"L-1": "pending_review", "L-2": "closed", "L-3": None, "L-4": None}


def test_property_list_uses_only_the_latest_season(client, db):
    # last year's approved issue must not close this year's open one
    add_evidence(db, add_point(db, "S-1", year=2025), "approved")
    add_point(db, "S-1", year=2026)
    add_point(db, "S-2", year=2025)
    add_evidence(db, add_point(db, "S-2", year=2026), "approved")
    owner = add_user(db, "owner.s@example.com", assets=["S-1", "S-2"])
    db.commit()
    sign_in(client, owner)

    shown = {p["asset_id"]: p["review_state"] for p in client.get(MINE).json()}
    assert shown == {"S-1": "open", "S-2": "closed"}


def test_state_changes_after_a_decision(client, db):
    point = add_point(db, "D-1")
    add_evidence(db, point, "pending_review")
    owner = add_user(db, "owner.d@example.com", assets=["D-1"])
    db.commit()
    sign_in(client, owner)
    assert client.get(MINE).json()[0]["review_state"] == "pending_review"

    db.query(Submission).filter_by(assessment_id=point.id).update({"status": "approved"})
    db.commit()
    assert client.get(MINE).json()[0]["review_state"] == "closed"
