import uuid
from datetime import datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.models import UserRole
from app.schemas import validators
from app.schemas.validators import EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH


class SignupRequest(BaseModel):
    """Public resident signup. Role is not accepted - it's always resident."""

    model_config = ConfigDict(extra="forbid")

    full_name: str
    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    password: str

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        return validators.clean_full_name(v)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        return validators.normalize_email(v)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validators.check_password_strength(v)

    @model_validator(mode="after")
    def password_not_personal(self) -> Self:
        validators.check_password_not_personal(self.password, self.email, self.full_name)
        return self


class LoginRequest(BaseModel):
    """Format checks only - strength rules apply at signup, not login."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    # not trimmed: spaces are part of the password
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    remember_me: bool = False

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        return validators.normalize_email(v)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None
    role: UserRole
    created_at: datetime
    property_ids: list[str] = Field(default_factory=list)
