import uuid
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from itertools import islice

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.importers.base import InspectionSource, PointRecord
from app.models import Assessment, CrewPhoto
from app.storage.base import PhotoStore

BATCH_SIZE = 1000

# file extension used in the storage key, by content type
PHOTO_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png"}


@dataclass
class ImportSummary:
    points_read: int = 0
    points_inserted: int = 0
    points_skipped: int = 0
    photos_read: int = 0
    photos_inserted: int = 0
    photos_skipped: int = 0
    photos_orphaned: int = 0
    # global ids of photos whose point was not found (for warning lines)
    orphan_photo_ids: list[uuid.UUID] = field(default_factory=list)


def photo_key(assessment_id: uuid.UUID, photo_id: uuid.UUID, content_type: str) -> str:
    # never built from the original file name, so odd names cannot cause trouble
    ext = PHOTO_EXTENSIONS.get(content_type, "jpg")
    return f"crew/{assessment_id}/{photo_id}.{ext}"


def _chunks(items: Iterable, size: int) -> Iterator[list]:
    it = iter(items)
    while chunk := list(islice(it, size)):
        yield chunk


def _blank_to_none(value: str | None) -> str | None:
    # any source may hand over "" or spaces; the database should hold NULL instead
    return (value or "").strip() or None


def _point_row(rec: PointRecord, season_year: int) -> dict:
    return {
        "season_year": season_year,
        "source_global_id": rec.global_id,
        "asset_id": rec.asset_id,
        "parent_asset_id": rec.parent_asset_id,
        "prior_asset_id": rec.prior_asset_id,
        "status": rec.status,
        "comments": _blank_to_none(rec.comments),
        "crew_code": rec.crew_code,
        "inspected_at": rec.inspected_at,
        "photo_flag": rec.photo_flag,
        "site_address": _blank_to_none(rec.site_address),
        "site_type": rec.site_type,
        "inspection_type": rec.inspection_type,
        # ST_MakePoint takes longitude first
        "location": func.ST_SetSRID(func.ST_MakePoint(rec.lon, rec.lat), 4326),
    }


def import_points(db: Session, source: InspectionSource, season_year: int, summary: ImportSummary):
    for batch in _chunks(source.read_points(), BATCH_SIZE):
        stmt = (
            pg_insert(Assessment)
            .values([_point_row(rec, season_year) for rec in batch])
            .on_conflict_do_nothing(index_elements=["season_year", "source_global_id"])
            .returning(Assessment.id)
        )
        added = len(db.execute(stmt).all())
        summary.points_read += len(batch)
        summary.points_inserted += added
        summary.points_skipped += len(batch) - added
    db.commit()


def import_photos(
    db: Session,
    source: InspectionSource,
    season_year: int,
    photo_store: PhotoStore,
    summary: ImportSummary,
):
    saved_keys: list[str] = []
    try:
        for rec in source.read_photos():
            summary.photos_read += 1

            already = db.scalar(
                select(CrewPhoto.id).where(CrewPhoto.source_global_id == rec.global_id)
            )
            if already is not None:
                summary.photos_skipped += 1
                continue

            parent_id = db.scalar(
                select(Assessment.id).where(
                    Assessment.season_year == season_year,
                    Assessment.source_global_id == rec.parent_global_id,
                )
            )
            if parent_id is None:
                summary.photos_orphaned += 1
                summary.orphan_photo_ids.append(rec.global_id)
                continue

            new_id = uuid.uuid4()
            key = photo_key(parent_id, new_id, rec.content_type)
            photo_store.save(key, rec.data, rec.content_type)
            saved_keys.append(key)
            db.add(
                CrewPhoto(
                    id=new_id,
                    assessment_id=parent_id,
                    source_global_id=rec.global_id,
                    file_name=rec.file_name[:255],
                    content_type=rec.content_type,
                    size_bytes=len(rec.data),
                    storage_key=key,
                )
            )
            db.flush()
            summary.photos_inserted += 1
        db.commit()
    except Exception:
        # do not leave files behind that no database row points to
        db.rollback()
        for key in saved_keys:
            photo_store.delete(key)
        raise


def import_inspections(
    db: Session,
    source: InspectionSource,
    season_year: int,
    photo_store: PhotoStore,
) -> ImportSummary:
    """Load one season's points and photos. Running it twice changes nothing."""
    summary = ImportSummary()
    import_points(db, source, season_year, summary)
    import_photos(db, source, season_year, photo_store, summary)
    return summary
