from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.security import create_access_token
from app.models import User
from app.schemas.auth import LoginRequest, SignupRequest, UserOut
from app.services.user_service import (
    EmailAlreadyRegisteredError,
    InactiveAccountError,
    InvalidCredentialsError,
    PropertyNotFoundError,
    authenticate,
    create_resident,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        created_at=user.created_at,
        property_ids=[link.asset_id for link in user.resident_assets],
    )


def set_auth_cookie(response: Response, user: User, *, remember_me: bool = False) -> None:
    max_age = (
        settings.remembered_access_token_expire_minutes
        if remember_me
        else settings.access_token_expire_minutes
    )
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=create_access_token(user.id, max_age),
        max_age=max_age * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


@router.post(
    "/signup",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_409_CONFLICT: {"description": "Email already registered"}},
)
def signup(payload: SignupRequest, response: Response, db: DbSession) -> UserOut:
    """Create a resident account."""
    try:
        user = create_resident(db, payload)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists."
        ) from None
    except PropertyNotFoundError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {
                "code": "property_not_found",
                "message": "We could not match that address and Asset ID.",
                "field": "asset_id",
            },
        ) from None
    set_auth_cookie(response, user)
    return user_out(user)


@router.post(
    "/login",
    response_model=UserOut,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Invalid email or password"},
        status.HTTP_403_FORBIDDEN: {"description": "Account is disabled"},
    },
)
def login(payload: LoginRequest, response: Response, db: DbSession) -> UserOut:
    """Log in and set the access token as an HttpOnly cookie."""
    try:
        user = authenticate(db, payload)
    except InvalidCredentialsError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password") from None
    except InactiveAccountError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Account is disabled. Contact the Scottsdale Fire Department.",
        ) from None

    set_auth_cookie(response, user, remember_me=payload.remember_me)
    return user_out(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    """Clear the auth cookie. Safe to call when already logged out."""
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


@router.get(
    "/me",
    response_model=UserOut,
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"}},
)
def me(user: CurrentUser) -> UserOut:
    """Return the logged-in user."""
    return user_out(user)
