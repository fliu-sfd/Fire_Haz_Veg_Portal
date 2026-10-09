import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.models import FirefighterProfile, ResidentProfile, User, UserRole

pytestmark = pytest.mark.db

FAKE_HASH = "$2b$12$notarealhashjustfortestingxxxxxxxxxxxxxxxxxxxxxxxxxxx"


def make_user(email="jane@example.com", role=UserRole.RESIDENT, **kw):
    return User(email=email, password_hash=FAKE_HASH, full_name="Jane Doe", role=role, **kw)


def test_new_user_gets_defaults(db):
    u = make_user()
    db.add(u)
    db.flush()
    db.refresh(u)
    print("created:", u, u.id)

    assert u.id is not None
    assert u.role == UserRole.RESIDENT
    assert u.is_active is True
    assert u.email_verified is False
    assert u.created_at is not None


def test_role_defaults_to_resident_when_not_given(db):
    u = User(email="norole@example.com", password_hash=FAKE_HASH, full_name="No Role")
    db.add(u)
    db.flush()
    db.refresh(u)
    assert u.role == UserRole.RESIDENT


def test_email_unique_ignores_case(db):
    db.add(make_user("Bob@Example.com"))
    db.flush()
    db.add(make_user("bob@example.com"))
    with pytest.raises(IntegrityError) as err:
        db.flush()
    print("duplicate blocked:", type(err.value.orig).__name__)


def test_invalid_role_rejected(db):
    db.execute(text("SAVEPOINT bad_role"))
    with pytest.raises(Exception) as err:
        db.execute(
            text(
                "INSERT INTO users (email, password_hash, full_name, role) "
                "VALUES ('x@y.com', 'h', 'X', 'superuser')"
            )
        )
    db.execute(text("ROLLBACK TO SAVEPOINT bad_role"))
    print("bad role error:", type(err.value.orig).__name__)
    assert "user_role" in str(err.value)


def test_resident_with_profile(db):
    u = make_user("res@example.com")
    u.resident_profile = ResidentProfile(street_address="7575 E Main St", zip_code="85251")
    db.add(u)
    db.flush()
    db.refresh(u.resident_profile)

    assert u.resident_profile.city == "Scottsdale"
    assert u.resident_profile.state == "AZ"


def test_firefighter_employee_id_unique(db):
    a = make_user("ff1@scottsdale.test", UserRole.FIREFIGHTER)
    a.firefighter_profile = FirefighterProfile(employee_id="E1001", station_code="616C")
    b = make_user("ff2@scottsdale.test", UserRole.FIREFIGHTER)
    b.firefighter_profile = FirefighterProfile(employee_id="E1001", station_code="615B")
    db.add(a)
    db.flush()
    db.add(b)
    with pytest.raises(IntegrityError):
        db.flush()


def test_deleting_user_removes_profile(db):
    u = make_user("gone@example.com", UserRole.FIREFIGHTER)
    u.firefighter_profile = FirefighterProfile(employee_id="E2002")
    db.add(u)
    db.flush()
    uid = u.id

    db.delete(u)
    db.flush()
    left = db.scalar(select(FirefighterProfile).where(FirefighterProfile.user_id == uid))
    assert left is None


def test_admin_needs_no_profile(db):
    admin = make_user("admin@scottsdale.test", UserRole.ADMIN)
    db.add(admin)
    db.flush()
    assert admin.resident_profile is None
    assert admin.firefighter_profile is None
