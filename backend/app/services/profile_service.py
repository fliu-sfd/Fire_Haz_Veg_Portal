import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User, UserRole
from app.schemas.firefighter import FirefighterOut
from app.schemas.me import PasswordChange, ProfileOut, ProfileUpdate
from app.schemas.validators import check_password_not_personal

logger = logging.getLogger(__name__)


class WrongCurrentPasswordError(Exception):
    pass


class PasswordUnchangedError(Exception):
    pass


class PersonalPasswordError(Exception):
    """The new password contains the user's name or email. Carries the message to show."""


def get_profile(user: User) -> ProfileOut:
    profile = user.firefighter_profile
    return ProfileOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        email_verified=user.email_verified,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        asset_ids=sorted(link.asset_id for link in user.resident_assets),
        # an ex-firefighter keeps their old profile row, but it is not theirs to see now
        firefighter=(
            FirefighterOut(employee_id=profile.employee_id, station_code=profile.station_code)
            if user.role is UserRole.FIREFIGHTER and profile is not None
            else None
        ),
    )


def update_profile(db: Session, user: User, data: ProfileUpdate) -> ProfileOut:
    changed = []
    for field in ("full_name", "phone"):
        if field in data.model_fields_set and getattr(data, field) != getattr(user, field):
            setattr(user, field, getattr(data, field))
            changed.append(field)
    if not changed:
        return get_profile(user)

    db.commit()
    db.refresh(user)
    # field names only: values such as the phone stay out of the logs
    logger.info("user %s updated own profile: %s", user.id, ", ".join(changed))
    return get_profile(user)


def change_password(db: Session, user: User, data: PasswordChange) -> None:
    """Replace the password and mark the time, so tokens issued earlier stop working."""
    if not verify_password(data.current_password, user.password_hash):
        raise WrongCurrentPasswordError
    if data.new_password == data.current_password:
        raise PasswordUnchangedError
    try:
        check_password_not_personal(data.new_password, user.email, user.full_name)
    except ValueError as exc:
        raise PersonalPasswordError(str(exc)) from None

    user.password_hash = hash_password(data.new_password)
    user.password_changed_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    logger.info("user %s updated own profile: password", user.id)
