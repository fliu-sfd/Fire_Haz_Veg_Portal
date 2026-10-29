from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.me import ProfileOut, ProfileUpdate
from app.services.profile_service import get_profile, update_profile

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
