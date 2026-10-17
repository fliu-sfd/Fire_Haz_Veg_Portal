import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import UserRole

SEARCH_MAX_LENGTH = 100
PAGE_MAX_SIZE = 100


class UserSortField(enum.StrEnum):
    FULL_NAME = "full_name"
    EMAIL = "email"
    ROLE = "role"
    ASSET_IDS = "asset_ids"
    CREATED_AT = "created_at"


class SortOrder(enum.StrEnum):
    ASC = "asc"
    DESC = "desc"


class UserListParams(BaseModel):
    """Query string for the admin user list. Unknown parameters are rejected."""

    model_config = ConfigDict(extra="forbid")

    q: str | None = Field(None, max_length=SEARCH_MAX_LENGTH)
    role: UserRole | None = None
    sort: UserSortField = UserSortField.CREATED_AT
    order: SortOrder = SortOrder.DESC
    limit: int = Field(25, ge=1, le=PAGE_MAX_SIZE)
    offset: int = Field(0, ge=0)

    @field_validator("q")
    @classmethod
    def blank_search_is_none(cls, v: str | None) -> str | None:
        v = " ".join(v.split()) if v else v
        return v or None


class AdminUserOut(BaseModel):
    """Only the fields the admin list shows. Everything else on the user is left out."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: UserRole
    asset_ids: list[str]
    created_at: datetime


class AdminUserList(BaseModel):
    items: list[AdminUserOut]
    total: int
    limit: int
    offset: int
