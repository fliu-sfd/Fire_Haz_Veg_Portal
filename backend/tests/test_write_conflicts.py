"""Branches that only run when two writes to the same row collide.

Two requests landing at the same moment are simulated by making the "already exists?"
check miss, so the database's unique index is what catches the duplicate.
"""

import pytest
from sqlalchemy import func, select

from app.models import FullAssessmentRequest, ResidentAsset, User, UserRole
from app.schemas.admin import AdminUserUpdate
from app.schemas.auth import SignupRequest
from app.services import admin_user_service, assessment_request_service, user_service
from app.services.admin_user_service import EmailTakenError, update_user
from app.services.assessment_request_service import create_request
from app.services.user_service import EmailAlreadyRegisteredError, create_admin, create_resident

pytestmark = pytest.mark.db

PASSWORD = "Correct-Horse-42!"


def add_account(db, email, role=UserRole.RESIDENT, name="Pat Example"):
    account = User(email=email, password_hash="not-a-real-hash", full_name=name, role=role)
    db.add(account)
    db.commit()
    return account


def check_misses(monkeypatch, module, name="get_user_by_email"):
    """Make the service's own duplicate check find nothing, as if the other request was late."""
    monkeypatch.setattr(module, name, lambda *args, **kwargs: None)


# ---------------------------------------------------------------- accounts


def test_signup_race_on_the_same_email_is_reported_as_taken(db, monkeypatch):
    add_account(db, "race@example.com")
    check_misses(monkeypatch, user_service)
    form = SignupRequest(full_name="Second Person", email="RACE@example.com", password=PASSWORD)

    with pytest.raises(EmailAlreadyRegisteredError):
        create_resident(db, form)
    assert db.scalar(select(func.count()).select_from(User)) == 1


def test_create_admin_refuses_an_email_already_in_use(db):
    add_account(db, "staff@example.com")
    with pytest.raises(EmailAlreadyRegisteredError):
        create_admin(db, "staff@example.com", "New Admin", PASSWORD)


def test_create_admin_race_on_the_same_email_is_reported_as_taken(db, monkeypatch):
    add_account(db, "staff@example.com")
    check_misses(monkeypatch, user_service)

    with pytest.raises(EmailAlreadyRegisteredError):
        create_admin(db, "Staff@example.com", "New Admin", PASSWORD)
    assert db.scalar(select(func.count()).select_from(User)) == 1


def test_admin_email_change_race_is_reported_as_taken(db, monkeypatch):
    admin = add_account(db, "boss@example.com", UserRole.ADMIN, "Boss Admin")
    add_account(db, "taken@example.com")
    target = add_account(db, "target@example.com")
    check_misses(monkeypatch, admin_user_service)

    with pytest.raises(EmailTakenError):
        update_user(db, admin, target.id, AdminUserUpdate(email="TAKEN@example.com"))
    db.refresh(target)
    assert target.email == "target@example.com"


# ---------------------------------------------------------------- full assessment requests


def test_two_requests_at_once_end_with_the_first_one(db, monkeypatch):
    owner = add_account(db, "owner@example.com")
    db.add(ResidentAsset(user_id=owner.id, asset_id="HOME-1"))
    db.commit()
    first = create_request(db, owner, "HOME-1", "First note")

    real_open_request = assessment_request_service.open_request
    calls = []

    def late_then_real(session, asset_id):
        calls.append(asset_id)
        # the first look misses the other request; the look after the conflict finds it
        return None if len(calls) == 1 else real_open_request(session, asset_id)

    monkeypatch.setattr(assessment_request_service, "open_request", late_then_real)
    second = create_request(db, owner, "home-1", "Second note")

    assert second.id == first.id
    assert second.note == "First note"
    assert len(calls) == 2
    assert db.scalar(select(func.count()).select_from(FullAssessmentRequest)) == 1
