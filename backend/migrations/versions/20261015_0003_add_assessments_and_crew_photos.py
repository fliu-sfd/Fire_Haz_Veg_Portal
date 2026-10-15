"""add assessments and crew photos

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-15

Tables for the City's yearly NAOS inspection file: one row per inspected
point (assessments) and one row per crew photo (crew_photos). The photo
files themselves are kept in the photo store, not in the database.

"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assessments",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("season_year", sa.SmallInteger(), nullable=False),
        sa.Column("source_global_id", sa.UUID(), nullable=False),
        sa.Column("asset_id", sa.String(length=32), nullable=False),
        sa.Column("parent_asset_id", sa.String(length=32), nullable=True),
        sa.Column("prior_asset_id", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("crew_code", sa.String(length=16), nullable=True),
        sa.Column("inspected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("photo_flag", sa.Boolean(), nullable=True),
        sa.Column("site_address", sa.String(length=255), nullable=True),
        sa.Column("site_type", sa.String(length=80), nullable=True),
        sa.Column("inspection_type", sa.String(length=80), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(
                geometry_type="POINT", srid=4326, spatial_index=False, from_text="ST_GeomFromEWKT"
            ),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assessments")),
        sa.UniqueConstraint(
            "season_year", "source_global_id", name="uq_assessments_season_global_id"
        ),
    )
    op.create_index(op.f("ix_assessments_asset_id"), "assessments", ["asset_id"], unique=False)
    op.create_index(op.f("ix_assessments_status"), "assessments", ["status"], unique=False)
    op.create_index(op.f("ix_assessments_crew_code"), "assessments", ["crew_code"], unique=False)
    op.create_index(
        "ix_assessments_location",
        "assessments",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )
    op.create_table(
        "crew_photos",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("assessment_id", sa.UUID(), nullable=False),
        sa.Column("source_global_id", sa.UUID(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=50), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assessment_id"],
            ["assessments.id"],
            name=op.f("fk_crew_photos_assessment_id_assessments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crew_photos")),
        sa.UniqueConstraint("source_global_id", name=op.f("uq_crew_photos_source_global_id")),
    )
    op.create_index(
        op.f("ix_crew_photos_assessment_id"), "crew_photos", ["assessment_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_crew_photos_assessment_id"), table_name="crew_photos")
    op.drop_table("crew_photos")
    op.drop_index("ix_assessments_location", table_name="assessments", postgresql_using="gist")
    op.drop_index(op.f("ix_assessments_crew_code"), table_name="assessments")
    op.drop_index(op.f("ix_assessments_status"), table_name="assessments")
    op.drop_index(op.f("ix_assessments_asset_id"), table_name="assessments")
    op.drop_table("assessments")
