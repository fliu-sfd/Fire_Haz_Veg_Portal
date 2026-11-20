"""enable postgis and pgcrypto

Baseline migration so any database (docker, Azure, RDS...) ends up with
the same extensions, not just the one created by db/init.

Revision ID: 0001
Revises:
Create Date: 2026-10-07
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")


def downgrade() -> None:
    # extensions are left in place on purpose; dropping postgis would
    # wipe any geometry columns added by later migrations
    pass
