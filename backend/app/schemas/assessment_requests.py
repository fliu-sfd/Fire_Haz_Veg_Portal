"""Request and response shapes for full assessment requests."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AssessmentRequestCreate(BaseModel):
    """A homeowner's request. The note is optional, and a blank note is saved as null."""

    model_config = ConfigDict(extra="forbid")

    note: str | None = Field(None, max_length=2000)

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class AssessmentRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: str
    note: str | None
    requested_at: datetime
    status: Literal["open", "handled"]
    handled_at: datetime | None


class AdminAssessmentRequestOut(AssessmentRequestOut):
    """A request as admins see it, with who asked and who handled it.

    A homeowner whose account was removed shows as "Former homeowner".
    """

    homeowner_name: str
    handled_by_name: str | None


class AssessmentRequestListOut(BaseModel):
    items: list[AdminAssessmentRequestOut]
    total: int
    limit: int
    offset: int
