"""Field rules shared by more than one request schema.

Each function takes the raw value and returns the cleaned one, or raises ValueError
with the message the client sees. Wrap them in a field_validator on the schema.
"""

import re
from typing import Protocol

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

_PHONE_RE = re.compile(r"\+?[0-9 ()\-]+")


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


class MessageLimits(Protocol):
    """The limits clean_message reads from a registry entry."""

    min_length: int
    max_length: int
    max_lines: int


_LINE_BREAK_RE = re.compile(r"\r\n?")
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x09\x0b-\x1f]")
_SPACES_RE = re.compile(r" +")
_EXTRA_BREAKS_RE = re.compile(r"\n{3,}")


def clean_message(text: str, spec: MessageLimits) -> str:
    """Plain text only, so < and > are left alone. Mirrored in the frontend's utils/message.ts."""
    text = _CONTROL_CHARS_RE.sub("", _LINE_BREAK_RE.sub("\n", text))
    lines = [_SPACES_RE.sub(" ", line).strip(" ") for line in text.split("\n")]
    text = _EXTRA_BREAKS_RE.sub("\n\n", "\n".join(lines)).strip("\n")

    if text.count("\n") + 1 > spec.max_lines:
        raise ValueError(f"Message must be at most {spec.max_lines} lines")
    if len(text) < spec.min_length:
        raise ValueError(f"Message must be at least {spec.min_length} characters")
    if len(text) > spec.max_length:
        raise ValueError(f"Message must be at most {spec.max_length} characters")
    return text
