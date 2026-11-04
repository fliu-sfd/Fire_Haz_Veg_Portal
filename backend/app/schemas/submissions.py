import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.assessments import InspectionPointOut


class SubmissionPhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_name: str
    content_type: Literal["image/jpeg", "image/png"]
    size_bytes: int


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    assessment_id: uuid.UUID
    comment: str | None
    status: Literal["pending_review", "approved", "rejected"]
    created_at: datetime
    updated_at: datetime | None = None
    is_own_submission: bool = False
    can_edit: bool = False
    can_review: bool = False
    version: int = 1
    reviewed_at: datetime | None = None
    review_comment: str | None = None
    photos: list[SubmissionPhotoOut]


class ReviewDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["approved", "rejected"]
    expected_version: int = Field(ge=1)
    comment: str | None = Field(None, max_length=2000)

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value):
        return value.strip() or None if value is not None else None

    @model_validator(mode="after")
    def require_send_back_reason(self):
        if self.decision == "rejected" and not self.comment:
            raise ValueError("Explain what work or evidence is needed before sending this back.")
        return self


class ReviewInboxItem(BaseModel):
    submission_id: uuid.UUID
    assessment_id: uuid.UUID
    asset_id: str
    site_address: str | None
    homeowner_name: str
    created_at: datetime
    updated_at: datetime | None
    photo_count: int
    inspected_at: datetime | None
    inspection_comments: str | None


class ReviewDetailOut(BaseModel):
    asset_id: str
    season_year: int
    homeowner_name: str
    inspection: InspectionPointOut
    submission: SubmissionOut
    history: list[SubmissionOut]


class ReviewInboxOut(BaseModel):
    items: list[ReviewInboxItem]
    total: int
    limit: int
    offset: int


class PendingReviewCount(BaseModel):
    pending: int
