import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CrewPhotoOut(BaseModel):
    """Safe metadata for a crew photo. The file is fetched through a protected route."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_name: str
    content_type: str
    size_bytes: int


class InspectionPointOut(BaseModel):
    """One inspection point in the latest season for an asset."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    comments: str | None
    inspected_at: datetime | None
    inspection_type: str | None
    site_address: str | None
    photos: list[CrewPhotoOut]


class PropertyAssessmentOut(BaseModel):
    """Latest-season inspection points for one property asset."""

    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    season_year: int
    site_address: str | None
    inspections: list[InspectionPointOut]
