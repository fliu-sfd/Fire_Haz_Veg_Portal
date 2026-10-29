from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.deps import CurrentUser, DbSession
from app.api.routes.auth import set_auth_cookie
from app.core.config import settings
from app.schemas.me import PasswordChange, ProfileOut, ProfileUpdate
from app.services.profile_service import (
    PasswordUnchangedError,
    PersonalPasswordError,
    WrongCurrentPasswordError,
    change_password,
    get_profile,
    update_profile,
)

# every route acts on the signed-in user only: the id never comes from the URL or body
router = APIRouter(
    prefix="/me",
    tags=["me"],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"}},
)


@router.get("/profile", response_model=ProfileOut)
def read_profile(user: CurrentUser) -> ProfileOut:
    """The signed-in user's own account details."""
    return get_profile(user)


@router.patch("/profile", response_model=ProfileOut)
def patch_profile(user: CurrentUser, payload: ProfileUpdate, db: DbSession) -> ProfileOut:
    """Change your own full name or phone. Only sent fields change; phone null clears it."""
    return update_profile(db, user, payload)


def _remembered(request: Request) -> bool:
    claims = request.state.token_claims
    lifetime = claims.expires_at - claims.issued_at
    return lifetime > timedelta(minutes=settings.access_token_expire_minutes)


@router.post(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        # 400, not 401: a 401 would make the frontend treat the session as ended
        status.HTTP_400_BAD_REQUEST: {"description": "Current password is not correct"},
    },
)
def post_password(
    user: CurrentUser, payload: PasswordChange, request: Request, response: Response, db: DbSession
) -> None:
    """Change your own password. Other sessions end; this browser gets a fresh cookie."""
    try:
        change_password(db, user, payload)
    except WrongCurrentPasswordError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {
                "code": "wrong_current_password",
                "message": "Your current password is not correct.",
                "field": "current_password",
            },
        ) from None
    except PasswordUnchangedError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            {
                "code": "password_unchanged",
                "message": "Choose a new password that is different from your current one.",
                "field": "new_password",
            },
        ) from None
    except PersonalPasswordError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            {"code": "password_personal", "message": str(exc), "field": "new_password"},
        ) from None
    set_auth_cookie(response, user, remember_me=_remembered(request))
