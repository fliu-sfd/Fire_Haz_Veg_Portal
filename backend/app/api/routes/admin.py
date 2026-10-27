import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.admin import (
    AdminUserDetail,
    AdminUserList,
    AdminUserUpdate,
    AssetLinkRequest,
    UserListParams,
)
from app.schemas.validators import ASSET_ID_MAX_LENGTH
from app.services.admin_user_service import (
    AssetsResidentsOnlyError,
    CannotChangeOwnAccessError,
    EmailTakenError,
    EmployeeIdTakenError,
    FirefighterDetailsRequiredError,
    FirefighterNotApplicableError,
    LastAdminError,
    UnlinkAssetsFirstError,
    UserNotFoundError,
    get_user_detail,
    link_asset,
    list_users,
    unlink_asset,
    update_user,
)
from app.services.user_service import PropertyNotFoundError

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"},
        status.HTTP_403_FORBIDDEN: {"description": "Administrator access required"},
    },
)

# domain error -> (status, code, message, field)
_ERRORS: dict[type[Exception], tuple[int, str, str, str | None]] = {
    UserNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "user_not_found",
        "This user no longer exists.",
        None,
    ),
    EmailTakenError: (
        status.HTTP_409_CONFLICT,
        "email_taken",
        "Another account already uses this email.",
        "email",
    ),
    EmployeeIdTakenError: (
        status.HTTP_409_CONFLICT,
        "employee_id_taken",
        "Another firefighter already has this employee ID.",
        "firefighter.employee_id",
    ),
    FirefighterDetailsRequiredError: (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "firefighter_details_required",
        "Enter an employee ID to make this user a firefighter.",
        "firefighter.employee_id",
    ),
    FirefighterNotApplicableError: (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "firefighter_not_applicable",
        "Firefighter details only apply to firefighter accounts.",
        None,
    ),
    UnlinkAssetsFirstError: (
        status.HTTP_409_CONFLICT,
        "unlink_assets_first",
        "Remove this user's linked properties before changing their role.",
        None,
    ),
    CannotChangeOwnAccessError: (
        status.HTTP_409_CONFLICT,
        "cannot_change_own_access",
        "You can't change your own role or turn off your own account.",
        None,
    ),
    LastAdminError: (
        status.HTTP_409_CONFLICT,
        "last_admin",
        "This is the only active admin. Make another user an admin first.",
        None,
    ),
    AssetsResidentsOnlyError: (
        status.HTTP_409_CONFLICT,
        "assets_residents_only",
        "Only homeowner accounts can have linked properties.",
        None,
    ),
    PropertyNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "property_not_found",
        "No inspection record has this asset ID.",
        "asset_id",
    ),
}


def _http_error(exc: Exception) -> HTTPException:
    status_code, code, message, field = _ERRORS[type(exc)]
    detail = {"code": code, "message": message}
    if field is not None:
        detail["field"] = field
    return HTTPException(status_code, detail)


@router.get("/users", response_model=AdminUserList)
def get_users(
    _admin: AdminUser,
    params: Annotated[UserListParams, Query()],
    db: DbSession,
) -> AdminUserList:
    """List all users with search, role filter, sorting and paging. Administrators only."""
    return list_users(db, params)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetail,
    responses={status.HTTP_404_NOT_FOUND: {"description": "User not found"}},
)
def get_user(_admin: AdminUser, user_id: uuid.UUID, db: DbSession) -> AdminUserDetail:
    """Full detail for one user. Administrators only."""
    try:
        return get_user_detail(db, user_id)
    except UserNotFoundError as exc:
        raise _http_error(exc) from None


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserDetail,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
        status.HTTP_409_CONFLICT: {"description": "Change breaks a business rule"},
    },
)
def patch_user(
    admin: AdminUser, user_id: uuid.UUID, payload: AdminUserUpdate, db: DbSession
) -> AdminUserDetail:
    """Change details, role, status or firefighter fields. Only sent fields change.

    Administrators only.
    """
    try:
        return update_user(db, admin, user_id, payload)
    except tuple(_ERRORS) as exc:
        raise _http_error(exc) from None


@router.post(
    "/users/{user_id}/assets",
    response_model=AdminUserDetail,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User or asset not found"},
        status.HTTP_409_CONFLICT: {"description": "User is not a resident"},
    },
)
def post_user_asset(
    admin: AdminUser, user_id: uuid.UUID, payload: AssetLinkRequest, db: DbSession
) -> AdminUserDetail:
    """Link a resident to an asset ID from the inspection data. Administrators only."""
    try:
        return link_asset(db, admin, user_id, payload.asset_id)
    except tuple(_ERRORS) as exc:
        raise _http_error(exc) from None


@router.delete(
    "/users/{user_id}/assets/{asset_id}",
    response_model=AdminUserDetail,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
        status.HTTP_409_CONFLICT: {"description": "User is not a resident"},
    },
)
def delete_user_asset(
    admin: AdminUser,
    user_id: uuid.UUID,
    asset_id: Annotated[str, Path(max_length=ASSET_ID_MAX_LENGTH)],
    db: DbSession,
) -> AdminUserDetail:
    """Unlink a resident from an asset ID. Administrators only."""
    try:
        return unlink_asset(db, admin, user_id, asset_id)
    except tuple(_ERRORS) as exc:
        raise _http_error(exc) from None
