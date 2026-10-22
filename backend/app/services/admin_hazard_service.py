from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement, Integer, Subquery, case, cast, func, literal, select
from sqlalchemy.orm import Session

from app.models import Assessment, CrewPhoto
from app.schemas.admin_hazards import (
    HazardFilterOptions,
    HazardList,
    HazardListParams,
    HazardOut,
    HazardState,
    PropertyType,
)

ISSUES_STATUS = "ISSUES"
NAOS_SITE_TYPE = "Community"

# the map needs every marker at once, so there is no paging; the cap only guards the
# browser if the data ever grows far past a season's few hundred hazards
HAZARD_LIMIT = 5000

# Scottsdale has no daylight saving, and a date must mean the same day for every admin,
# so day boundaries use the city's zone instead of the server's or the browser's.
REPORTING_ZONE = ZoneInfo("America/Phoenix")


def today_in_reporting_zone() -> date:
    return datetime.now(REPORTING_ZONE).date()


def age_in_days(inspected_at: datetime | None, today: date) -> int | None:
    if inspected_at is None:
        return None
    # a clock that runs ahead in the field must not give a negative age
    return max(0, (today - inspected_at.astimezone(REPORTING_ZONE).date()).days)


def derive_state() -> ColumnElement[str]:
    # every hazard stays open until the admin review workflow stores pending and closed states
    return literal(HazardState.OPEN.value)


def property_type_of(site_type: ColumnElement[str | None]) -> ColumnElement[str]:
    # the Residential site_type is unconfirmed until that data arrives
    return case(
        (site_type == NAOS_SITE_TYPE, PropertyType.NAOS.value),
        else_=PropertyType.RESIDENTIAL.value,
    )


def latest_season(db: Session) -> int | None:
    return db.scalar(select(func.max(Assessment.season_year)))


def _hazards(season: int) -> Subquery:
    """One row per hazard asset: centroid of its issue points plus its latest issue row's details.

    Grouping stays inside one season because asset IDs are reissued every year.
    """
    newest_first = (Assessment.inspected_at.desc().nulls_last(), Assessment.source_global_id.desc())
    # photos are counted per row before the join, so they never multiply the rows
    # that feed the centroid and the latest-row details
    photos = (
        select(CrewPhoto.assessment_id, func.count().label("photo_count"))
        .group_by(CrewPhoto.assessment_id)
        .subquery()
    )
    issue_rows = (
        select(
            Assessment.asset_id,
            Assessment.crew_code,
            Assessment.inspected_at,
            Assessment.comments,
            Assessment.location,
            func.coalesce(photos.c.photo_count, 0).label("photo_count"),
            property_type_of(Assessment.site_type).label("property_type"),
            func.row_number()
            .over(partition_by=Assessment.asset_id, order_by=newest_first)
            .label("rank"),
            func.first_value(Assessment.site_address)
            .over(
                partition_by=Assessment.asset_id,
                order_by=(Assessment.site_address.is_(None), *newest_first),
            )
            .label("latest_address"),
        )
        .outerjoin(photos, photos.c.assessment_id == Assessment.id)
        .where(
            Assessment.season_year == season,
            Assessment.status == ISSUES_STATUS,
            Assessment.location.is_not(None),
        )
        .subquery()
    )

    def latest(column: ColumnElement) -> ColumnElement:
        return func.max(case((issue_rows.c.rank == 1, column)))

    centroid = func.ST_Centroid(func.ST_Collect(issue_rows.c.location))
    return (
        select(
            issue_rows.c.asset_id,
            derive_state().label("state"),
            latest(issue_rows.c.property_type).label("property_type"),
            latest(issue_rows.c.crew_code).label("crew_code"),
            latest(issue_rows.c.inspected_at).label("inspected_at"),
            latest(issue_rows.c.comments).label("comments"),
            func.max(issue_rows.c.latest_address).label("site_address"),
            cast(func.sum(issue_rows.c.photo_count), Integer).label("photo_count"),
            func.ST_Y(centroid).label("latitude"),
            func.ST_X(centroid).label("longitude"),
        )
        .group_by(issue_rows.c.asset_id)
        .subquery("hazards")
    )


def _filters(hazards: Subquery, params: HazardListParams) -> list[ColumnElement[bool]]:
    filters: list[ColumnElement[bool]] = []
    if params.state:
        filters.append(hazards.c.state.in_([s.value for s in params.state]))
    if params.crew:
        filters.append(hazards.c.crew_code.in_(params.crew))
    if params.property_type is not None:
        filters.append(hazards.c.property_type == params.property_type.value)
    return filters


def list_hazards(db: Session, params: HazardListParams) -> HazardList:
    season = latest_season(db)
    if season is None:
        return HazardList(season_year=None, total=0, items=[])

    hazards = _hazards(season)
    filters = _filters(hazards, params)
    total = db.scalar(select(func.count()).select_from(hazards).where(*filters)) or 0
    rows = db.execute(
        select(hazards).where(*filters).order_by(hazards.c.asset_id).limit(HAZARD_LIMIT)
    ).mappings()
    today = today_in_reporting_zone()
    return HazardList(
        season_year=season,
        total=total,
        items=[
            HazardOut.model_validate({**row, "age_days": age_in_days(row["inspected_at"], today)})
            for row in rows
        ],
    )


def hazard_filter_options(db: Session) -> HazardFilterOptions:
    season = latest_season(db)
    if season is None:
        return HazardFilterOptions(season_year=None, crews=[], property_types=[])

    crews = db.scalars(
        select(Assessment.crew_code)
        .where(
            Assessment.season_year == season,
            Assessment.status == ISSUES_STATUS,
            Assessment.crew_code.is_not(None),
        )
        .distinct()
        .order_by(Assessment.crew_code)
    ).all()
    hazards = _hazards(season)
    present = set(db.scalars(select(hazards.c.property_type).distinct()))
    return HazardFilterOptions(
        season_year=season,
        crews=list(crews),
        property_types=[t for t in PropertyType if t.value in present],
    )
