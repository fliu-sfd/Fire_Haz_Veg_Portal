from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def build_engine(url: str | None = None) -> Engine:
    # pool_pre_ping drops dead connections after the db container restarts
    return create_engine(
        url or settings.database_url,
        echo=settings.db_echo,
        pool_pre_ping=True,
    )


engine = build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency - one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
