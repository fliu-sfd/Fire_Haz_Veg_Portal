"""add the review status of issues and its change history

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-03

Every inspection point the crew marked ISSUES is followed up until it is closed. This
adds the follow-up state to the assessment (open, pending_review, closed) and a table
that keeps each change with who made it and why. Points without an issue keep a null
state, and existing issues start as open.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

review_status = postgresql.ENUM(
    "open", "pending_review", "closed", name="review_status", create_type=False
)


def upgrade() -> None:
    review_status.create(op.get_bind(), checkfirst=True)

    op.add_column("assessments", sa.Column("review_status", review_status, nullable=True))
    op.create_index(
        op.f("ix_assessments_review_status"), "assessments", ["review_status"], unique=False
    )
    op.execute("UPDATE assessments SET review_status = 'open' WHERE status = 'ISSUES'")

    op.create_table(
        "assessment_status_changes",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("assessment_id", sa.UUID(), nullable=False),
        sa.Column("from_status", review_status, nullable=True),
        sa.Column("to_status", review_status, nullable=False),
        sa.Column("changed_by", sa.UUID(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "from_status IS NULL OR from_status <> to_status",
            name="ck_assessment_status_changes_moves",
        ),
        sa.ForeignKeyConstraint(
            ["assessment_id"],
            ["assessments.id"],
            name=op.f("fk_assessment_status_changes_assessment_id_assessments"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["changed_by"],
            ["users.id"],
            name=op.f("fk_assessment_status_changes_changed_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assessment_status_changes")),
    )
    op.create_index(
        op.f("ix_assessment_status_changes_assessment_id"),
        "assessment_status_changes",
        ["assessment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assessment_status_changes_changed_by"),
        "assessment_status_changes",
        ["changed_by"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_assessment_status_changes_changed_by"), table_name="assessment_status_changes"
    )
    op.drop_index(
        op.f("ix_assessment_status_changes_assessment_id"), table_name="assessment_status_changes"
    )
    op.drop_table("assessment_status_changes")
    op.drop_index(op.f("ix_assessments_review_status"), table_name="assessments")
    op.drop_column("assessments", "review_status")
    review_status.drop(op.get_bind(), checkfirst=True)
