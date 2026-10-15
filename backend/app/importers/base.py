import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class PointRecord:
    """One inspected point, already cleaned: no braces on ids, None for blanks,
    and lon/lat in WGS84 (EPSG:4326)."""

    global_id: uuid.UUID
    asset_id: str
    parent_asset_id: str | None
    prior_asset_id: str | None
    status: str
    comments: str | None
    crew_code: str | None
    inspected_at: datetime | None
    photo_flag: bool | None
    site_address: str | None
    site_type: str | None
    inspection_type: str | None
    lon: float
    lat: float


@dataclass(frozen=True)
class PhotoRecord:
    """One photo and the id of the point it belongs to."""

    parent_global_id: uuid.UUID
    global_id: uuid.UUID
    file_name: str
    content_type: str
    data: bytes


class InspectionSource(Protocol):
    """Anything the import service can read inspections from.

    The geodatabase file is the first source. A live API client can be added
    later by writing a class with these same two methods.
    """

    def read_points(self) -> Iterator[PointRecord]: ...

    def read_photos(self) -> Iterator[PhotoRecord]: ...
