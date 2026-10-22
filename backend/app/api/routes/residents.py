from fastapi import APIRouter, status

from app.api.deps import DbSession, ResidentUser
from app.schemas.residents import PropertyOut
from app.services.property_service import list_user_properties

router = APIRouter(prefix="/residents", tags=["residents"])


@router.get(
    "/me/properties",
    response_model=list[PropertyOut],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"},
        status.HTTP_403_FORBIDDEN: {"description": "Resident access required"},
    },
)
def my_properties(user: ResidentUser, db: DbSession) -> list[PropertyOut]:
    """The properties linked to the signed-in resident, with their latest inspection result."""
    return [PropertyOut.model_validate(item) for item in list_user_properties(db, user)]
