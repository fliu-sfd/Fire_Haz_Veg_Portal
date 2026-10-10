import re
import uuid
from datetime import datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)

from app.models import UserRole

FULL_NAME_MIN_LENGTH = 2
FULL_NAME_MAX_LENGTH = 120  # users.full_name column
EMAIL_MAX_LENGTH = 254
PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 128

# letter runs ([^\W\d_] = any unicode letter) joined by space, apostrophe, hyphen or period:
# "Mary-Jane O'Neil", "J. R. Smith", "José Núñez"
_NAME_RE = re.compile(r"[^\W\d_]+(?:[ '.\-]+[^\W\d_]+)*\.?")
_PHONE_CHARS_RE = re.compile(r"\+?[\d\s().\-]+")
# NANP: area code and exchange can't start with 0 or 1
_US_PHONE_RE = re.compile(r"[2-9]\d{2}[2-9]\d{6}")


class SignupRequest(BaseModel):
    """Public resident signup. Role is not accepted - it's always resident."""

    model_config = ConfigDict(extra="forbid")

    full_name: str
    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    password: str
    confirm_password: str
    phone: str | None = None

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < FULL_NAME_MIN_LENGTH:
            raise ValueError(f"Full name must be at least {FULL_NAME_MIN_LENGTH} characters")
        if len(v) > FULL_NAME_MAX_LENGTH:
            raise ValueError(f"Full name must be at most {FULL_NAME_MAX_LENGTH} characters")
        if not _NAME_RE.fullmatch(v):
            raise ValueError(
                "Full name may only contain letters, spaces, apostrophes, hyphens and periods"
            )
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
        if len(v) > PASSWORD_MAX_LENGTH:
            raise ValueError(f"Password must be at most {PASSWORD_MAX_LENGTH} characters")
        if v != v.strip():
            raise ValueError("Password must not start or end with whitespace")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain a lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit")
        if not any(not c.isalnum() and not c.isspace() for c in v):
            raise ValueError("Password must contain a special character")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info: ValidationInfo) -> str:
        # password missing from info.data means it already failed; don't pile on
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_us_phone(cls, v: object) -> object:
        if v is None or not isinstance(v, str):
            return v
        v = v.strip()
        if not v:
            return None
        if not _PHONE_CHARS_RE.fullmatch(v):
            raise ValueError("Phone number contains invalid characters")
        digits = re.sub(r"\D", "", v)
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]
        if not _US_PHONE_RE.fullmatch(digits):
            raise ValueError("Enter a valid 10-digit US phone number")
        return f"+1{digits}"

    @model_validator(mode="after")
    def password_not_personal(self) -> Self:
        lowered = self.password.lower()
        personal = [self.email.split("@")[0], *self.full_name.split()]
        for part in personal:
            part = part.strip("'.-").lower()
            if len(part) >= 3 and part in lowered:
                raise ValueError("Password must not contain your name or email")
        return self


class LoginRequest(BaseModel):
    """Format checks only - strength rules apply at signup, not login."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(max_length=EMAIL_MAX_LENGTH)
    # not trimmed: spaces are part of the password
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        return v.strip().lower() if isinstance(v, str) else v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None
    role: UserRole
    created_at: datetime
