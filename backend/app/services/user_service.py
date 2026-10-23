from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import burn_password_check, hash_password, verify_password
from app.models import ResidentAsset, ResidentProfile, User, UserRole
from app.schemas.auth import LoginRequest, SignupRequest
from app.services.property_service import resolve_property


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


def create_resident(db: Session, data: SignupRequest) -> User:
    if get_user_by_email(db, data.email) is not None:
        raise EmailAlreadyRegisteredError
    asset_id = resolve_property(db, data.asset_id)
    if asset_id is None:
        raise PropertyNotFoundError

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.RESIDENT,
        resident_assets=[ResidentAsset(asset_id=asset_id)],
    )
    if data.property_address:
        user.resident_profile = ResidentProfile(street_address=data.property_address)
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
