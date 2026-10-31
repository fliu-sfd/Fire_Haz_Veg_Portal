"""add homeowner submissions and private photo metadata

Revision ID: 0008
Revises: 0007
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "submissions",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("assessment_id", sa.UUID(), nullable=False),
        sa.Column("homeowner_id", sa.UUID(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(24), server_default="pending_review", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('pending_review', 'approved', 'rejected')",
            name=op.f("ck_submissions_status"),
        ),
        sa.ForeignKeyConstraint(
            ["assessment_id"],
            ["assessments.id"],
            ondelete="CASCADE",
            name=op.f("fk_submissions_assessment_id_assessments"),
        ),
        sa.ForeignKeyConstraint(
            ["homeowner_id"],
            ["users.id"],
            ondelete="SET NULL",
            name=op.f("fk_submissions_homeowner_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_submissions")),
    )
    op.create_index(op.f("ix_submissions_assessment_id"), "submissions", ["assessment_id"])
    op.create_index(op.f("ix_submissions_homeowner_id"), "submissions", ["homeowner_id"])
    op.create_table(
        "submission_photos",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("submission_id", sa.UUID(), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(255), nullable=False),
        sa.CheckConstraint("size_bytes > 0", name=op.f("ck_submission_photos_positive_size")),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["submissions.id"],
            ondelete="CASCADE",
            name=op.f("fk_submission_photos_submission_id_submissions"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_submission_photos")),
        sa.UniqueConstraint("storage_key", name=op.f("uq_submission_photos_storage_key")),
    )
    op.create_index(
        op.f("ix_submission_photos_submission_id"), "submission_photos", ["submission_id"]
    )


def downgrade() -> None:
    op.drop_table("submission_photos")
    op.drop_table("submissions")
