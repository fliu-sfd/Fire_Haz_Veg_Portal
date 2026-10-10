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
    authenticate,
    create_resident,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_409_CONFLICT: {"description": "Email already registered"}},
)
def signup(payload: SignupRequest, db: DbSession) -> User:
    """Create a resident account."""
    try:
        return create_resident(db, payload)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists."
        ) from None


@router.post(
    "/login",
    response_model=UserOut,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Invalid email or password"},
        status.HTTP_403_FORBIDDEN: {"description": "Account is disabled"},
    },
)
def login(payload: LoginRequest, response: Response, db: DbSession) -> User:
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

    response.set_cookie(
        key=settings.auth_cookie_name,
        value=create_access_token(user.id),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    return user


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
def me(user: CurrentUser) -> User:
    """Return the logged-in user."""
    return user
