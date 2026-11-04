from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, status

from app.api.deps import DbSession, ResidentUser
from app.schemas.residents import LinkPropertyRequest, PropertyOut
from app.schemas.validators import ASSET_ID_MAX_LENGTH
from app.services.property_service import (
    PropertyNotFoundError,
    PropertySummary,
    list_user_properties,
)
from app.services.resident_property_service import (
    MAX_LINKED_PROPERTIES,
    AlreadyLinkedError,
    LinkNotAllowedError,
    TooManyPropertiesError,
    add_property,
    remove_property,
)

router = APIRouter(
    prefix="/residents",
    tags=["residents"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"},
        status.HTTP_403_FORBIDDEN: {"description": "Resident access required"},
    },
)

# domain error -> (status, code, message, field)
_ERRORS: dict[type[Exception], tuple[int, str, str, str | None]] = {
    PropertyNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "property_not_found",
        "We could not find that Asset ID. Check the number on your door tag.",
        "asset_id",
    ),
    AlreadyLinkedError: (
        status.HTTP_409_CONFLICT,
        "already_linked",
        "This property is already on your account.",
        "asset_id",
    ),
    TooManyPropertiesError: (
        status.HTTP_409_CONFLICT,
        "too_many_properties",
        f"You can link up to {MAX_LINKED_PROPERTIES} properties. "
        "Contact the Scottsdale Fire Department if you need more.",
        None,
    ),
    LinkNotAllowedError: (
        status.HTTP_409_CONFLICT,
        "link_not_allowed",
        "This property cannot be added to your account. Contact the Scottsdale Fire Department.",
        "asset_id",
    ),
}


def _http_error(exc: Exception) -> HTTPException:
    status_code, code, message, field = _ERRORS[type(exc)]
    detail = {"code": code, "message": message}
    if field is not None:
        detail["field"] = field
    return HTTPException(status_code, detail)


def _out(properties: list[PropertySummary]) -> list[PropertyOut]:
    return [PropertyOut.model_validate(item) for item in properties]


@router.get("/me/properties", response_model=list[PropertyOut])
def my_properties(user: ResidentUser, db: DbSession) -> list[PropertyOut]:
    """The properties linked to the signed-in resident, with their latest inspection result."""
    return _out(list_user_properties(db, user))


@router.post(
    "/me/properties",
    response_model=list[PropertyOut],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Asset ID is not in the inspection data"},
        status.HTTP_409_CONFLICT: {"description": "Already linked, or the limit is reached"},
    },
)
def link_my_property(
    payload: LinkPropertyRequest, user: ResidentUser, db: DbSession
) -> list[PropertyOut]:
    """Link an Asset ID to the signed-in resident. Returns the updated list."""
    try:
        return _out(add_property(db, user, payload.asset_id))
    except tuple(_ERRORS) as exc:
        raise _http_error(exc) from None


@router.delete("/me/properties/{asset_id}", response_model=list[PropertyOut])
def unlink_my_property(
    asset_id: Annotated[str, Path(max_length=ASSET_ID_MAX_LENGTH)],
    user: ResidentUser,
    db: DbSession,
) -> list[PropertyOut]:
    """Remove an Asset ID from the signed-in resident. Returns the updated list."""
    return _out(remove_property(db, user, asset_id))
