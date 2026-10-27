import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.admin import AdminUserDetail, AdminUserList, UserListParams
from app.services.admin_user_service import UserNotFoundError, get_user_detail, list_users

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
