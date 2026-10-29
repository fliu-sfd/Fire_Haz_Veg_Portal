from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import TokenClaims, decode_access_token
from app.db.session import get_db
from app.models import User, UserRole

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: DbSession) -> User:
    """Resolve the logged-in user from the auth cookie, or raise 401."""
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise unauthorized
    claims = decode_access_token(token)
    if claims is None:
        raise unauthorized
    user = db.get(User, claims.user_id)
    if user is None or not user.is_active:
        raise unauthorized
    if _issued_before_password_change(claims, user):
        raise unauthorized
    return user


def _issued_before_password_change(claims: TokenClaims, user: User) -> bool:
    if user.password_changed_at is None:
        return False
    # iat is whole seconds, so a token made in the same second as the change is still valid
    return claims.issued_at < user.password_changed_at.replace(microsecond=0)


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    """Allow only administrators. Logged-out requests already got 401 from CurrentUser."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator access required")
    return user


AdminUser = Annotated[User, Depends(require_admin)]


def require_resident(user: CurrentUser) -> User:
    """Allow only homeowner accounts. Logged-out requests already got 401 from CurrentUser."""
    if user.role != UserRole.RESIDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Homeowner access required")
    return user


ResidentUser = Annotated[User, Depends(require_resident)]
