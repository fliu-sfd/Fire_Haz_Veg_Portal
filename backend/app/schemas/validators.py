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
