"""remove the firefighter role and its profile table

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-03

The portal has two roles, resident and admin. Firefighters stay on ArcGIS and Survey123.
PostgreSQL cannot drop a value from an enum, so the type is replaced.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _replace_role_enum(*values: str) -> None:
    labels = ", ".join(f"'{value}'" for value in values)
    op.execute("ALTER TYPE user_role RENAME TO user_role_old")
    op.execute(f"CREATE TYPE user_role AS ENUM ({labels})")
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'resident'")
    op.execute("DROP TYPE user_role_old")


def upgrade() -> None:
    count = op.get_bind().scalar(sa.text("SELECT count(*) FROM users WHERE role = 'firefighter'"))
    if count:
        # never guess what to do with real people's accounts
        raise RuntimeError(
            f"{count} firefighter accounts exist. "
            "Change or remove them before running this migration."
        )

    op.drop_table("firefighter_profiles")
    _replace_role_enum("resident", "admin")


def downgrade() -> None:
    _replace_role_enum("resident", "firefighter", "admin")
    op.create_table(
        "firefighter_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("employee_id", sa.String(length=32), nullable=False),
        sa.Column("station_code", sa.String(length=16), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_firefighter_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_firefighter_profiles")),
        sa.UniqueConstraint("employee_id", name=op.f("uq_firefighter_profiles_employee_id")),
    )
