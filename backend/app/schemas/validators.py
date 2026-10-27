"""Field rules shared by more than one request schema.

Each function takes the raw value and returns the cleaned one, or raises ValueError
with the message the client sees. Wrap them in a field_validator on the schema.
"""

import re

FULL_NAME_MIN_LENGTH = 2
FULL_NAME_MAX_LENGTH = 120  # users.full_name column
EMAIL_MAX_LENGTH = 254

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
