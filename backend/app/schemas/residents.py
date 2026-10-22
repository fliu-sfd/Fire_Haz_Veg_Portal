from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PropertyOut(BaseModel):
    """A property linked to the signed-in resident, with its latest inspection result."""

    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    season_year: int | None
    latest_status: str | None
    latest_inspected_at: datetime | None
    site_address: str | None
