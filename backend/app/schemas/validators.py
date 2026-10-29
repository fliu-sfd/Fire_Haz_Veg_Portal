"""Field rules shared by more than one request schema.

Each function takes the raw value and returns the cleaned one, or raises ValueError
with the message the client sees. Wrap them in a field_validator on the schema.
"""

import re

FULL_NAME_MIN_LENGTH = 2
FULL_NAME_MAX_LENGTH = 120  # users.full_name column
EMAIL_MAX_LENGTH = 254
ASSET_ID_MAX_LENGTH = 32  # resident_assets.asset_id column
PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 128

# letter runs ([^\W\d_] = any unicode letter) joined by space, apostrophe, hyphen or period:
# "Mary-Jane O'Neil", "J. R. Smith", "José Núñez"
_NAME_RE = re.compile(r"[^\W\d_]+(?:[ '.\-]+[^\W\d_]+)*\.?")


def clean_full_name(v: str) -> str:
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


def normalize_email(v: object) -> object:
    """Run before EmailStr parsing, so non-strings fall through to its own error."""
    return v.strip().lower() if isinstance(v, str) else v


def clean_asset_id(v: str) -> str:
    v = v.strip().upper()
    if not v:
        raise ValueError("Asset ID is required")
    if len(v) > ASSET_ID_MAX_LENGTH:
        raise ValueError(f"Asset ID must be at most {ASSET_ID_MAX_LENGTH} characters")
    if not re.fullmatch(r"[A-Z0-9_-]+", v):
        raise ValueError("Asset ID may only contain letters, numbers, hyphens and underscores")
    return v


PHONE_MAX_LENGTH = 20  # users.phone column
PHONE_MIN_DIGITS = 10
PHONE_MAX_DIGITS = 15
EMPLOYEE_ID_MAX_LENGTH = 32  # firefighter_profiles.employee_id column
STATION_CODE_MAX_LENGTH = 16  # firefighter_profiles.station_code column

_PHONE_RE = re.compile(r"\+?[0-9 ()\-]+")
_EMPLOYEE_ID_RE = re.compile(r"[A-Z0-9_-]+")


def clean_phone(v: str | None) -> str | None:
    """Kept as typed, apart from extra spaces. Blank means no phone."""
    if v is None:
        return None
    v = " ".join(v.split())
    if not v:
        return None
    if len(v) > PHONE_MAX_LENGTH:
        raise ValueError(f"Phone must be at most {PHONE_MAX_LENGTH} characters")
    if not _PHONE_RE.fullmatch(v):
        raise ValueError(
            "Phone may only contain digits, spaces, hyphens, parentheses and a leading +"
        )
    digits = sum(c.isdigit() for c in v)
    if not PHONE_MIN_DIGITS <= digits <= PHONE_MAX_DIGITS:
        raise ValueError(f"Phone must have {PHONE_MIN_DIGITS} to {PHONE_MAX_DIGITS} digits")
    return v


def clean_employee_id(v: str) -> str:
    v = v.strip().upper()
    if not v:
        raise ValueError("Employee ID is required")
    if len(v) > EMPLOYEE_ID_MAX_LENGTH:
        raise ValueError(f"Employee ID must be at most {EMPLOYEE_ID_MAX_LENGTH} characters")
    if not _EMPLOYEE_ID_RE.fullmatch(v):
        raise ValueError("Employee ID may only contain letters, numbers, hyphens and underscores")
    return v


def clean_station_code(v: str | None) -> str | None:
    """Stored uppercase, like "616C". Blank means no station."""
    if v is None:
        return None
    v = v.strip().upper()
    if len(v) > STATION_CODE_MAX_LENGTH:
        raise ValueError(f"Station code must be at most {STATION_CODE_MAX_LENGTH} characters")
    return v or None


def check_password_strength(v: str) -> str:
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


def check_password_not_personal(password: str, email: str, full_name: str) -> None:
    """Reject a password that contains the email's local part or a name of 3+ letters."""
    lowered = password.lower()
    personal = [email.split("@")[0], *full_name.split()]
    for part in personal:
        part = part.strip("'.-").lower()
        if len(part) >= 3 and part in lowered:
            raise ValueError("Password must not contain your name or email")
