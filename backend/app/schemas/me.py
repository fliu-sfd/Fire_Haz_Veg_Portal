import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import UserRole
from app.schemas import validators
from app.schemas.firefighter import FirefighterOut
from app.schemas.validators import PASSWORD_MAX_LENGTH

__all__ = ["FirefighterOut", "PasswordChange", "ProfileOut", "ProfileUpdate"]


class ProfileOut(BaseModel):
    """The signed-in user's own account, as the profile page shows it. No password hash."""

    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None
    asset_ids: list[str]
    # only for firefighters
    firefighter: FirefighterOut | None


class ProfileUpdate(BaseModel):
    """Partial update of the user's own details. Only fields present in the body change.

    Only phone may be null (it clears the phone). Use model_fields_set to see what was sent.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = None
    phone: str | None = None

    @field_validator("full_name")
    @classmethod
    def not_null(cls, v: str | None) -> str | None:
        # validators skip defaults, so this only runs when the field was sent
        if v is None:
            raise ValueError("Value may not be null")
        return v

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        return validators.clean_full_name(v)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str | None) -> str | None:
        return validators.clean_phone(v)

    @model_validator(mode="after")
    def at_least_one_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Send at least one field to change")
        return self


class PasswordChange(BaseModel):
    """The personal-info rule needs the saved name and email, so the service checks it."""

    model_config = ConfigDict(extra="forbid")

    # not trimmed: spaces are part of the password
    current_password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validators.check_password_strength(v)
