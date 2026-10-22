from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.admin_hazards import HazardFilterOptions, HazardList, HazardListParams
from app.services.admin_hazard_service import hazard_filter_options, list_hazards

router = APIRouter(
    prefix="/admin/hazards",
    tags=["admin"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"},
        status.HTTP_403_FORBIDDEN: {"description": "Administrator access required"},
    },
)


@router.get("", response_model=HazardList)
def get_hazards(
    _admin: AdminUser,
    params: Annotated[HazardListParams, Query()],
    db: DbSession,
) -> HazardList:
    """Hazard assets of the latest season for the map, with state, crew and type filters.

    Administrators only.
    """
    return list_hazards(db, params)


@router.get("/filters", response_model=HazardFilterOptions)
def get_hazard_filters(_admin: AdminUser, db: DbSession) -> HazardFilterOptions:
    """Values the hazard map filters offer, whatever is filtered now. Administrators only."""
    return hazard_filter_options(db)
