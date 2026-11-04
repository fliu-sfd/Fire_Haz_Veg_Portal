"""add full assessment requests

Revision ID: 0011
Revises: 0010
"""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "full_assessment_requests",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("asset_id", sa.String(length=32), nullable=False),
        sa.Column("homeowner_id", sa.UUID(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "requested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("handled_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(
            ["handled_by"],
            ["users.id"],
            name=op.f("fk_full_assessment_requests_handled_by_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["homeowner_id"],
            ["users.id"],
            name=op.f("fk_full_assessment_requests_homeowner_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_full_assessment_requests")),
    )
    op.create_index(
        op.f("ix_full_assessment_requests_asset_id"),
        "full_assessment_requests",
        ["asset_id"],
    )
    op.create_index(
        op.f("ix_full_assessment_requests_homeowner_id"),
        "full_assessment_requests",
        ["homeowner_id"],
    )
    op.create_index(
        op.f("ix_full_assessment_requests_requested_at"),
        "full_assessment_requests",
        ["requested_at"],
    )
    op.create_index(
        op.f("ix_full_assessment_requests_handled_at"),
        "full_assessment_requests",
        ["handled_at"],
    )
    op.create_index(
        "uq_full_assessment_requests_open_asset",
        "full_assessment_requests",
        [sa.text("lower(asset_id)")],
        unique=True,
        postgresql_where=sa.text("handled_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_table("full_assessment_requests")
