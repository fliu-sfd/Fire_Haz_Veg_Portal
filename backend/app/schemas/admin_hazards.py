import enum
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

CREW_CODE_MAX_LENGTH = 16

CrewCode = Annotated[str, Field(min_length=1, max_length=CREW_CODE_MAX_LENGTH)]


class HazardState(enum.StrEnum):
    OPEN = "open"
    PENDING_REVIEW = "pending_review"
    CLOSED = "closed"


class PropertyType(enum.StrEnum):
    NAOS = "naos"
    RESIDENTIAL = "residential"


class HazardListParams(BaseModel):
    """Query string for the hazard map. Repeated values mean "any of"; unknown keys are rejected."""

    model_config = ConfigDict(extra="forbid")

    state: list[HazardState] = []
    crew: list[CrewCode] = []
    property_type: PropertyType | None = None


class HazardOut(BaseModel):
    """One hazard asset on the map. Photo, user and staff details are deliberately left out."""

    asset_id: str
    state: HazardState
    property_type: PropertyType
    crew_code: str | None
    inspected_at: datetime | None
    comments: str | None
    site_address: str | None
    # a count only: photo ids, names and storage keys stay server side
    photo_count: int = Field(ge=0)
    age_days: int | None = Field(ge=0)
    latitude: float
    longitude: float


class HazardList(BaseModel):
    season_year: int | None
    total: int
    items: list[HazardOut]


class HazardFilterOptions(BaseModel):
    season_year: int | None
    crews: list[str]
    property_types: list[PropertyType]
