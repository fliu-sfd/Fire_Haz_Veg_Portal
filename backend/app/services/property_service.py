"""Rules that connect a resident account to a property.

A "property" is an asset id from the City's inspection file. This is the only
module that decides what a Property ID means: if the sponsors say it is
something else, resolve_property() is what changes.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Assessment, ResidentAsset, User, UserRole
from app.services.review_state import ISSUES_RESULT, property_review_state


class PropertyNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class PropertySummary:
    asset_id: str
    season_year: int | None
    latest_status: str | None
    latest_inspected_at: datetime | None
    site_address: str | None
    # open, pending_review or closed for the latest season; None when it has no issue
    review_state: str | None = None


def resolve_property(db: Session, property_id: str | None) -> str | None:
    """Return the asset id as stored in the data, or None if no assessment has it.

    The sponsors confirmed on 14 October that the Property ID is the asset id
    written on the door tag. Spaces and letter case are ignored.
    """
    wanted = (property_id or "").strip()
    if not wanted:
        return None
    return db.scalar(
        select(Assessment.asset_id)
        .where(func.lower(Assessment.asset_id) == wanted.lower())
        .limit(1)
    )


def link_user_to_property(db: Session, user: User, asset_id: str) -> ResidentAsset:
    """Connect a user to an asset. Linking the same pair twice returns the first link."""
    existing = db.scalar(
        select(ResidentAsset).where(
            ResidentAsset.user_id == user.id, ResidentAsset.asset_id == asset_id
        )
    )
    if existing is not None:
        return existing
    link = ResidentAsset(user_id=user.id, asset_id=asset_id)
    db.add(link)
    db.flush()
    return link


def list_user_properties(db: Session, user: User) -> list[PropertySummary]:
    """Each asset the user is linked to, with its most recent inspection result."""
    linked = db.scalars(
        select(ResidentAsset.asset_id)
        .where(ResidentAsset.user_id == user.id)
        .order_by(ResidentAsset.created_at, ResidentAsset.asset_id)
    ).all()
    if not linked:
        return []

    # newest season first, then newest inspection date; the first row seen per asset wins
    rows = db.execute(
        select(
            Assessment.asset_id,
            Assessment.season_year,
            Assessment.status,
            Assessment.inspected_at,
            Assessment.site_address,
        )
        .where(Assessment.asset_id.in_(linked))
        .order_by(
            Assessment.asset_id,
            Assessment.season_year.desc(),
            Assessment.inspected_at.desc().nulls_last(),
        )
    )
    newest = {}
    for row in rows:
        newest.setdefault(row.asset_id, row)

    issue_points: dict[str, list[Assessment]] = {}
    for point in db.scalars(
        select(Assessment)
        .options(selectinload(Assessment.submissions))
        .where(Assessment.asset_id.in_(linked), Assessment.status == ISSUES_RESULT)
    ):
        if point.season_year == newest[point.asset_id].season_year:
            issue_points.setdefault(point.asset_id, []).append(point)
    result = []
    for asset_id in linked:
        row = newest.get(asset_id)
        result.append(
            PropertySummary(
                asset_id=asset_id,
                season_year=row.season_year if row else None,
                latest_status=row.status if row else None,
                latest_inspected_at=row.inspected_at if row else None,
                site_address=row.site_address if row else None,
                review_state=property_review_state(issue_points.get(asset_id, [])),
            )
        )
    return result


def can_view_assessment(db: Session, user: User, assessment: Assessment) -> bool:
    """Admins may open any assessment; a resident only those of properties they are linked to."""
    if user.role is UserRole.ADMIN:
        return True
    return bool(
        db.scalar(
            select(
                exists().where(
                    ResidentAsset.user_id == user.id,
                    func.lower(ResidentAsset.asset_id) == assessment.asset_id.lower(),
                )
            )
        )
    )
