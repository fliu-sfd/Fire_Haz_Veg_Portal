"""link resident accounts to verified assessment assets

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("resident_profiles", "zip_code", existing_type=sa.String(10), nullable=True)
    op.create_table(
        "resident_assets",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("asset_id", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_resident_assets_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_resident_assets")),
        sa.UniqueConstraint("user_id", "asset_id", name="uq_resident_assets_user_asset"),
    )
    op.create_index(op.f("ix_resident_assets_user_id"), "resident_assets", ["user_id"])
    op.create_index(op.f("ix_resident_assets_asset_id"), "resident_assets", ["asset_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_resident_assets_asset_id"), table_name="resident_assets")
    op.drop_index(op.f("ix_resident_assets_user_id"), table_name="resident_assets")
    op.drop_table("resident_assets")
    op.alter_column("resident_profiles", "zip_code", existing_type=sa.String(10), nullable=False)
