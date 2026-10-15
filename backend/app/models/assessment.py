import uuid
from datetime import datetime

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Assessment(Base):
    """One crew inspection of one point, as delivered in the City's yearly file.

    The same asset_id shows up many times (one asset is inspected over and
    over), so asset_id is only indexed. A row is identified by the season
    plus the GlobalID the City's system gave it, which lets a re-import of
    the same file update rows instead of duplicating them.
    """

    __tablename__ = "assessments"
    __table_args__ = (
        UniqueConstraint("season_year", "source_global_id", name="uq_assessments_season_global_id"),
        Index("ix_assessments_location", "location", postgresql_using="gist"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )

    # identity in the source file
    season_year: Mapped[int] = mapped_column(SmallInteger)
    source_global_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    asset_id: Mapped[str] = mapped_column(String(32), index=True)
    parent_asset_id: Mapped[str | None] = mapped_column(String(32))
    prior_asset_id: Mapped[str | None] = mapped_column(String(32))

    # result of the inspection
    status: Mapped[str] = mapped_column(String(40), index=True)
    comments: Mapped[str | None] = mapped_column(Text)
    crew_code: Mapped[str | None] = mapped_column(String(16), index=True)
    inspected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    photo_flag: Mapped[bool | None] = mapped_column(Boolean)

    # where and what
    site_address: Mapped[str | None] = mapped_column(String(255))
    site_type: Mapped[str | None] = mapped_column(String(80))
    inspection_type: Mapped[str | None] = mapped_column(String(80))
    # lon/lat in WGS84; the index is declared above so its name is ours
    location: Mapped[WKBElement | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False)
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    photos: Mapped[list["CrewPhoto"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Assessment {self.season_year} asset={self.asset_id} {self.status}>"


class CrewPhoto(Base):
    """A photo the crew took during an inspection.

    Only the details live here. The picture itself sits in the photo store
    under storage_key, so the database stays small.
    """

    __tablename__ = "crew_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), index=True
    )
    # the City's id for the attachment; unique so a re-import skips known photos
    source_global_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    file_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(50))
    size_bytes: Mapped[int] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assessment: Mapped[Assessment] = relationship(back_populates="photos")

    def __repr__(self) -> str:
        return f"<CrewPhoto {self.file_name} ({self.size_bytes} bytes)>"
