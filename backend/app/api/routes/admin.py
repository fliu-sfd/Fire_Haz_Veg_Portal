import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.admin import AdminUserDetail, AdminUserList, AdminUserUpdate, UserListParams
from app.services.admin_user_service import (
    CannotChangeOwnAccessError,
    EmailTakenError,
    EmployeeIdTakenError,
    FirefighterDetailsRequiredError,
    FirefighterNotApplicableError,
    LastAdminError,
    UnlinkAssetsFirstError,
    UserNotFoundError,
    get_user_detail,
    list_users,
    update_user,
)

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
