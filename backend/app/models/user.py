import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(enum.StrEnum):
    RESIDENT = "resident"
    FIREFIGHTER = "firefighter"
    ADMIN = "admin"


class User(Base):
    """Login account shared by all three roles.

    Residents sign up themselves. Firefighter and admin accounts are
    meant to be created by an admin (enforced in the API, not here).
    """

    __tablename__ = "users"
    __table_args__ = (
        # emails compare case-insensitively: Bob@x.com == bob@x.com
        Index("uq_users_email_lower", func.lower(text("email")), unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda e: [m.value for m in e],
        ),
        server_default=UserRole.RESIDENT.value,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    resident_profile: Mapped["ResidentProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    firefighter_profile: Mapped["FirefighterProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value}>"


class ResidentProfile(Base):
    """Extra info collected at resident signup."""

    __tablename__ = "resident_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    street_address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(80), server_default="Scottsdale")
    state: Mapped[str] = mapped_column(String(2), server_default="AZ")
    zip_code: Mapped[str] = mapped_column(String(10))
    hoa_name: Mapped[str | None] = mapped_column(String(120))  # for community/NAOS areas

    user: Mapped[User] = relationship(back_populates="resident_profile")


class FirefighterProfile(Base):
    """Department details for field crew accounts."""

    __tablename__ = "firefighter_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    employee_id: Mapped[str] = mapped_column(String(32), unique=True)
    station_code: Mapped[str | None] = mapped_column(String(16))  # crew code e.g. "616C"

    user: Mapped[User] = relationship(back_populates="firefighter_profile")
