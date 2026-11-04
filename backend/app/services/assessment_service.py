import uuid
from dataclasses import dataclass

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Assessment, CrewPhoto, User
from app.services.property_service import can_view_assessment


class AssessmentNotFoundError(Exception):
    """The asset is missing or the user is not allowed to know it exists."""


class CrewPhotoNotFoundError(Exception):
    """The photo is missing or the user is not allowed to know it exists."""


@dataclass(frozen=True)
class PropertyAssessment:
    asset_id: str
    season_year: int
    site_address: str | None
    inspections: list[Assessment]


def get_latest_property_assessment(db: Session, user: User, asset_id: str) -> PropertyAssessment:
    """Return the latest season of an asset when the signed-in user may view it."""
    wanted = asset_id.strip()
    if not wanted:
        raise AssessmentNotFoundError

    latest_season = db.scalar(
        select(func.max(Assessment.season_year)).where(
            func.lower(Assessment.asset_id) == wanted.lower()
        )
    )
    if latest_season is None:
        raise AssessmentNotFoundError

    rows = list(
        db.scalars(
            select(Assessment)
            .options(selectinload(Assessment.photos), selectinload(Assessment.submissions))
            .where(
                func.lower(Assessment.asset_id) == wanted.lower(),
                Assessment.season_year == latest_season,
            )
            .order_by(
                case((Assessment.status == "ISSUES", 0), else_=1),
                Assessment.inspected_at.desc().nulls_last(),
                Assessment.id,
            )
        ).all()
    )
    if not rows or not can_view_assessment(db, user, rows[0]):
        raise AssessmentNotFoundError

    address = next((row.site_address for row in rows if row.site_address), None)
    return PropertyAssessment(
        asset_id=rows[0].asset_id,
        season_year=latest_season,
        site_address=address,
        inspections=rows,
    )


def get_crew_photo(db: Session, user: User, photo_id: uuid.UUID) -> CrewPhoto:
    """Return photo metadata when the user may view its assessment."""
    photo = db.scalar(
        select(CrewPhoto)
        .options(selectinload(CrewPhoto.assessment))
        .where(CrewPhoto.id == photo_id)
    )
    if photo is None or not can_view_assessment(db, user, photo.assessment):
        raise CrewPhotoNotFoundError
    return photo
