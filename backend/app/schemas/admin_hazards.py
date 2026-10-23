import enum
import re
from datetime import date, datetime
from typing import Annotated, Self

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator

CREW_CODE_MAX_LENGTH = 16
SEARCH_MAX_LENGTH = 100

CrewCode = Annotated[str, Field(min_length=1, max_length=CREW_CODE_MAX_LENGTH)]


def _calendar_date_only(value: object) -> object:
    # pydantic would also take timestamps and datetimes; links only ever carry YYYY-MM-DD
    if isinstance(value, str) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Use a calendar date in YYYY-MM-DD form")
    return value


CalendarDate = Annotated[date, BeforeValidator(_calendar_date_only)]


class HazardState(enum.StrEnum):
    OPEN = "open"
    PENDING_REVIEW = "pending_review"
    CLOSED = "closed"


class PropertyType(enum.StrEnum):
    NAOS = "naos"
    RESIDENTIAL = "residential"


class AttentionReason(enum.StrEnum):
    NO_PHOTO = "no_photo"
    NO_COMMENT = "no_comment"


class HazardListParams(BaseModel):
    """Query string for the hazard map. Repeated values mean "any of"; unknown keys are rejected."""

    model_config = ConfigDict(extra="forbid")

    state: list[HazardState] = []
    crew: list[CrewCode] = []
    property_type: PropertyType | None = None
    q: str | None = Field(None, max_length=SEARCH_MAX_LENGTH)
    inspected_from: CalendarDate | None = None
    inspected_to: CalendarDate | None = None
    has_photo: bool | None = None
    needs_attention: bool | None = None

    @field_validator("q")
    @classmethod
    def blank_search_is_none(cls, v: str | None) -> str | None:
        v = " ".join(v.split()) if v else v
        return v or None

    @model_validator(mode="after")
    def dates_in_order(self) -> Self:
        if self.inspected_from and self.inspected_to and self.inspected_from > self.inspected_to:
            raise ValueError("inspected_from must not be after inspected_to")
        return self


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
    attention_reasons: list[AttentionReason]
    latitude: float
    longitude: float


class HazardStateCounts(BaseModel):
    open: int = 0
    pending_review: int = 0
    closed: int = 0


class HazardSummary(BaseModel):
    """Counts over every match, before the item cap."""

    # every filter except state, so each tile shows what choosing that state would give
    by_state: HazardStateCounts
    # every filter except needs_attention itself
    needs_attention: int


class HazardList(BaseModel):
    season_year: int | None
    total: int
    summary: HazardSummary
    items: list[HazardOut]


class HazardFilterOptions(BaseModel):
    season_year: int | None
    crews: list[str]
    property_types: list[PropertyType]
