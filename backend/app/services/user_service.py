import re
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import burn_password_check, hash_password, verify_password
from app.models import Assessment, ResidentAsset, ResidentProfile, User, UserRole
from app.schemas.auth import LoginRequest, SignupRequest


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InactiveAccountError(Exception):
    pass


class PropertyNotFoundError(Exception):
    pass


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def _normalized_address(value: str) -> str:
    """Normalize harmless formatting differences without weakening address verification."""
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value.casefold()).split())


def property_matches_asset(db: Session, asset_id: str, address: str) -> bool:
    addresses = db.scalars(
        select(Assessment.site_address).where(func.lower(Assessment.asset_id) == asset_id.lower())
    ).all()
    expected = _normalized_address(address)
    return any(value and _normalized_address(value) == expected for value in addresses)


def create_resident(db: Session, data: SignupRequest) -> User:
    if get_user_by_email(db, data.email) is not None:
        raise EmailAlreadyRegisteredError
    if not property_matches_asset(db, data.asset_id, data.property_address):
        raise PropertyNotFoundError

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.RESIDENT,
        resident_profile=ResidentProfile(street_address=data.property_address),
        resident_assets=[ResidentAsset(asset_id=data.asset_id)],
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        # two signups with the same email raced past the check above
        db.rollback()
        raise EmailAlreadyRegisteredError from exc
    db.refresh(user)
    return user


def authenticate(db: Session, data: LoginRequest) -> User:
    """Check credentials and record the login.

    Inactive accounts are only revealed after a correct password.
    """
    user = get_user_by_email(db, data.email)
    if user is None:
        burn_password_check()
        raise InvalidCredentialsError
    if not verify_password(data.password, user.password_hash):
        raise InvalidCredentialsError
    if not user.is_active:
        raise InactiveAccountError

    user.last_login_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return user
