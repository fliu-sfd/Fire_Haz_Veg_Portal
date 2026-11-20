"""track department decisions and evidence versions

Revision ID: 0010
Revises: 0009
"""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "submissions", sa.Column("version", sa.Integer(), server_default="1", nullable=False)
    )
    op.add_column(
        "submissions", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("submissions", sa.Column("reviewed_by", sa.UUID(), nullable=True))
    op.add_column("submissions", sa.Column("review_comment", sa.Text(), nullable=True))
    op.create_foreign_key(
        op.f("fk_submissions_reviewed_by_users"),
        "submissions",
        "users",
        ["reviewed_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("fk_submissions_reviewed_by_users"), "submissions", type_="foreignkey")
    for name in ("review_comment", "reviewed_by", "reviewed_at", "version"):
        op.drop_column("submissions", name)
