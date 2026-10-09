import uuid
from datetime import UTC, datetime, timedelta
from functools import cache

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Argon2id - no 72-byte input limit like bcrypt
_password_hash = PasswordHash.recommended()


def hash_password(plain: str) -> str:
    return _password_hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _password_hash.verify(plain, hashed)


@cache
def _dummy_hash() -> str:
    return hash_password("timing-equalizer-not-a-real-password")


def burn_password_check() -> None:
    """Spend the same time as a real check, so unknown emails can't be detected by timing."""
    verify_password("not-the-password", _dummy_hash())


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> uuid.UUID | None:
    """Return the user id from a valid access token, or None if invalid or expired."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp"]},
        )
        if payload.get("type") != "access":
            return None
        return uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
