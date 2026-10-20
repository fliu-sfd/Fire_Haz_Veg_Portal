from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.admin import AdminUserList, UserListParams
from app.services.admin_user_service import list_users

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/users",
    response_model=AdminUserList,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"},
        status.HTTP_403_FORBIDDEN: {"description": "Administrator access required"},
    },
)
def get_users(
    _admin: AdminUser,
    params: Annotated[UserListParams, Query()],
    db: DbSession,
) -> AdminUserList:
    """List all users with search, role filter, sorting and paging. Administrators only."""
    return list_users(db, params)
