import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db.session import engine


def _db_up() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except OperationalError:
        return False


def pytest_collection_modifyitems(config, items):
    if _db_up():
        return
    skip_db = pytest.mark.skip(reason="postgres not running (docker compose up -d db)")
    for item in items:
        if "db" in item.keywords:
            item.add_marker(skip_db)
