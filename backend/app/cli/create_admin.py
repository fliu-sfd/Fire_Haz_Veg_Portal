"""Create an admin account. This is how the first admin gets into the portal.

    uv run python -m app.cli.create_admin --email someone@example.com --name "Full Name"

The password is asked for twice and is never an argument, so it stays out of shell history.
To make an existing resident an admin, use the Users page instead.
"""

import argparse
import getpass
import sys
from collections.abc import Sequence
from typing import Annotated

from pydantic import EmailStr, Field, TypeAdapter, ValidationError

from app.db.session import SessionLocal
from app.schemas.validators import (
    EMAIL_MAX_LENGTH,
    check_password_not_personal,
    check_password_strength,
    clean_full_name,
    normalize_email,
)
from app.services.user_service import (
    EmailAlreadyRegisteredError,
    create_admin,
    get_user_by_email,
)

_EMAIL = TypeAdapter(Annotated[EmailStr, Field(max_length=EMAIL_MAX_LENGTH)])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli.create_admin",
        description=(
            "Create an active admin account. The password is asked for twice and is never "
            "an argument. To promote an existing resident, use the Users page."
        ),
    )
    parser.add_argument("--email", required=True, help="sign-in email for the new admin")
    parser.add_argument("--name", required=True, help='full name, for example "Full Name"')
    return parser


def _clean_email(raw: str) -> str:
    try:
        return _EMAIL.validate_python(normalize_email(raw))
    except ValidationError:
        # pydantic's full text is noise here, and only this one message can apply
        raise ValueError("Enter a valid email address") from None


def _ask_password(email: str, full_name: str) -> str:
    """Prompt twice. Validator messages describe the rule and never contain the password."""
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Password again: "):
        raise ValueError("The passwords do not match")
    check_password_strength(password)
    check_password_not_personal(password, email, full_name)
    return password


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    taken = "error: an account with this email already exists, nothing was changed"
    try:
        full_name = clean_full_name(args.name)
        email = _clean_email(args.email)
        with SessionLocal() as db:
            # checked first, so nobody types a password for an account that can't be made
            if get_user_by_email(db, email) is not None:
                print(taken, file=sys.stderr)
                return 1
            create_admin(db, email, full_name, _ask_password(email, full_name))
    except EmailAlreadyRegisteredError:
        print(taken, file=sys.stderr)
        return 1
    except ValueError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    except (EOFError, KeyboardInterrupt):
        print("\nerror: cancelled, nothing was changed", file=sys.stderr)
        return 1
    print(f"Created admin account for {email}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
