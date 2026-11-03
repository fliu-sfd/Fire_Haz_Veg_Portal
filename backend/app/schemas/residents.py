from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas import validators


class LinkPropertyRequest(BaseModel):
    """An Asset ID to link. Used by residents on their own account and by admins."""

    model_config = ConfigDict(extra="forbid")

    asset_id: str

    @field_validator("asset_id")
    @classmethod
    def clean_asset_id(cls, v: str) -> str:
        return validators.clean_asset_id(v)


class PropertyOut(BaseModel):
    """A property linked to the signed-in resident, with its latest inspection result."""

    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    season_year: int | None
    latest_status: str | None
    latest_inspected_at: datetime | None
    site_address: str | None
