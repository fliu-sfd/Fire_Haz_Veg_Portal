from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User, UserRole
from app.schemas.auth import SignupRequest


class EmailAlreadyRegisteredError(Exception):
    pass


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def create_resident(db: Session, data: SignupRequest) -> User:
    if get_user_by_email(db, data.email) is not None:
        raise EmailAlreadyRegisteredError

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.RESIDENT,
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
