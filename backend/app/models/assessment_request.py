import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FullAssessmentRequest(Base):
    """A homeowner's request for a department assessment of one property."""

    __tablename__ = "full_assessment_requests"
    __table_args__ = (
        Index(
            "uq_full_assessment_requests_open_asset",
            func.lower(text("asset_id")),
            unique=True,
            postgresql_where=text("handled_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    asset_id: Mapped[str] = mapped_column(String(32), index=True)
    homeowner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    note: Mapped[str | None] = mapped_column(Text)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    handled_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    @property
    def status(self) -> str:
        return "handled" if self.handled_at is not None else "open"
