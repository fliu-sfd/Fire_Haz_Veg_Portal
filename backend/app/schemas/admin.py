import enum
import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import UserRole
from app.schemas import validators
from app.schemas.validators import EMAIL_MAX_LENGTH

SEARCH_MAX_LENGTH = 100
PAGE_MAX_SIZE = 100


class UserSortField(enum.StrEnum):
    FULL_NAME = "full_name"
    EMAIL = "email"
    ROLE = "role"
    ASSET_IDS = "asset_ids"
    CREATED_AT = "created_at"
    LAST_LOGIN_AT = "last_login_at"
    IS_ACTIVE = "is_active"


class SortOrder(enum.StrEnum):
    ASC = "asc"
    DESC = "desc"


class UserListParams(BaseModel):
    """Query string for the admin user list. Unknown parameters are rejected."""

    model_config = ConfigDict(extra="forbid")

    q: str | None = Field(None, max_length=SEARCH_MAX_LENGTH)
    role: UserRole | None = None
    is_active: bool | None = None
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
    is_active: bool
    last_login_at: datetime | None


class AdminUserList(BaseModel):
    items: list[AdminUserOut]
    total: int
    limit: int
    offset: int


class FirefighterOut(BaseModel):
    employee_id: str
    station_code: str | None


class AdminUserDetail(BaseModel):
    """One user as the admin edit panel shows it. Never carries the password hash."""

    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None
    asset_ids: list[str]
    # kept after a firefighter changes role, so it can be reused if they come back
    firefighter: FirefighterOut | None


class FirefighterUpdate(BaseModel):
    """Replaces both firefighter fields. Leaving out station_code clears it."""

    model_config = ConfigDict(extra="forbid")

    employee_id: str
    station_code: str | None = None

    @field_validator("employee_id")
    @classmethod
    def clean_employee_id(cls, v: str) -> str:
        return validators.clean_employee_id(v)

    @field_validator("station_code")
    @classmethod
    def clean_station_code(cls, v: str | None) -> str | None:
        return validators.clean_station_code(v)


class AdminUserUpdate(BaseModel):
    """Partial update. Only fields present in the body are changed.

    Only phone may be null (it clears the phone). Use model_fields_set to see what was sent.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = None
    email: EmailStr | None = Field(None, max_length=EMAIL_MAX_LENGTH)
    phone: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    firefighter: FirefighterUpdate | None = None

    @field_validator("full_name", "email", "role", "is_active", "firefighter")
    @classmethod
    def not_null(cls, v: object) -> object:
        # validators skip defaults, so this only runs when the field was sent
        if v is None:
            raise ValueError("Value may not be null")
        return v

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        return validators.clean_full_name(v)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        return validators.normalize_email(v)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str | None) -> str | None:
        return validators.clean_phone(v)

    @model_validator(mode="after")
    def at_least_one_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Send at least one field to change")
        return self
