"""add users and role profiles

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-07

User accounts for signup/login. One users table for all roles
(resident, firefighter, admin) plus a small profile table per role.

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column(
            "role",
            sa.Enum("resident", "firefighter", "admin", name="user_role"),
            server_default="resident",
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("email_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)
    op.create_index(
        "uq_users_email_lower", "users", [sa.literal_column("lower(email)")], unique=True
    )
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
    op.create_table(
        "resident_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("street_address", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=80), server_default="Scottsdale", nullable=False),
        sa.Column("state", sa.String(length=2), server_default="AZ", nullable=False),
        sa.Column("zip_code", sa.String(length=10), nullable=False),
        sa.Column("hoa_name", sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_resident_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_resident_profiles")),
    )


def downgrade() -> None:
    op.drop_table("resident_profiles")
    op.drop_table("firefighter_profiles")
    op.drop_index("uq_users_email_lower", table_name="users")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_table("users")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
