"""Password hashing (Argon2id) and the JWT access tokens kept in the auth cookie."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import cache

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Argon2id - no 72-byte input limit like bcrypt
_password_hash = PasswordHash.recommended()


def hash_password(plain: str) -> str:
    """Hash a password for storing in users.password_hash."""
    return _password_hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """True when the password matches the stored hash."""
    return _password_hash.verify(plain, hashed)


@cache
def _dummy_hash() -> str:
    return hash_password("timing-equalizer-not-a-real-password")


def burn_password_check() -> None:
    """Spend the same time as a real check, so unknown emails can't be detected by timing."""
    verify_password("not-the-password", _dummy_hash())


def create_access_token(user_id: uuid.UUID, expire_minutes: int | None = None) -> str:
    """Sign a token for the user. Without expire_minutes it uses the normal lifetime."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=expire_minutes or settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


@dataclass(frozen=True)
class TokenClaims:
    """The parts of an access token the API uses."""

    user_id: uuid.UUID
    # whole seconds, as JWT stores them
    issued_at: datetime
    expires_at: datetime


def decode_access_token(token: str) -> TokenClaims | None:
    """Return the claims of a valid access token, or None if invalid or expired."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "iat"]},
        )
        if payload.get("type") != "access":
            return None
        return TokenClaims(
            user_id=uuid.UUID(payload["sub"]),
            issued_at=datetime.fromtimestamp(payload["iat"], UTC),
            expires_at=datetime.fromtimestamp(payload["exp"], UTC),
        )
    except (jwt.InvalidTokenError, ValueError, TypeError):
        return None
