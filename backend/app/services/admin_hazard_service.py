from collections.abc import Callable
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (
    ColumnElement,
    Date,
    Integer,
    Subquery,
    case,
    cast,
    func,
    literal,
    not_,
    or_,
    select,
)
from sqlalchemy.orm import Session

from app.models import Assessment, CrewPhoto
from app.schemas.admin_hazards import (
    AttentionReason,
    HazardFilterOptions,
    HazardList,
    HazardListParams,
    HazardOut,
    HazardState,
    HazardStateCounts,
    HazardSummary,
    PropertyType,
)
from app.services.text_search import LIKE_ESCAPE, like_pattern

ISSUES_STATUS = "ISSUES"
NAOS_SITE_TYPE = "Community"

# the map needs every marker at once, so there is no paging; the cap only guards the
# browser if the data ever grows far past a season's few hundred hazards
HAZARD_LIMIT = 5000

# Scottsdale has no daylight saving, and a date must mean the same day for every admin,
# so day boundaries use the city's zone instead of the server's or the browser's.
REPORTING_ZONE = ZoneInfo("America/Phoenix")


# Each reason and the SQL test for it, in the order the API lists them. A new reason
# needs one enum value and one entry here.
ATTENTION_CHECKS: list[tuple[AttentionReason, Callable[[Subquery], ColumnElement[bool]]]] = [
    # real photo rows, not photo_flag: the crew sets that flag by hand and it is unreliable
    (AttentionReason.NO_PHOTO, lambda h: h.c.photo_count == 0),
    (AttentionReason.NO_COMMENT, lambda h: h.c.comments.is_(None)),
]


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


def needs_attention(hazards: Subquery) -> ColumnElement[bool]:
    return or_(*(check(hazards) for _, check in ATTENTION_CHECKS))


def _conditions(hazards: Subquery, params: HazardListParams) -> dict[str, ColumnElement[bool]]:
    """Each active filter by parameter name, so the summary can leave one out."""
    conditions: dict[str, ColumnElement[bool]] = {}
    if params.state:
        conditions["state"] = hazards.c.state.in_([s.value for s in params.state])
    if params.crew:
        conditions["crew"] = hazards.c.crew_code.in_(params.crew)
    if params.property_type is not None:
        conditions["property_type"] = hazards.c.property_type == params.property_type.value
    if params.q:
        pattern = like_pattern(params.q)
        conditions["q"] = or_(
            hazards.c.asset_id.ilike(pattern, escape=LIKE_ESCAPE),
            hazards.c.site_address.ilike(pattern, escape=LIKE_ESCAPE),
        )
    # a hazard with no inspection time compares as NULL here, so any date bound excludes it
    inspected_day = cast(func.timezone(REPORTING_ZONE.key, hazards.c.inspected_at), Date)
    if params.inspected_from:
        conditions["inspected_from"] = inspected_day >= params.inspected_from
    if params.inspected_to:
        conditions["inspected_to"] = inspected_day <= params.inspected_to
    if params.has_photo is not None:
        has_photo = hazards.c.photo_count > 0
        conditions["has_photo"] = has_photo if params.has_photo else not_(has_photo)
    if params.needs_attention is not None:
        attention = needs_attention(hazards)
        conditions["needs_attention"] = attention if params.needs_attention else not_(attention)
    return conditions


def _summary(
    db: Session, hazards: Subquery, conditions: dict[str, ColumnElement[bool]]
) -> HazardSummary:
    def all_but(name: str) -> list[ColumnElement[bool]]:
        return [condition for key, condition in conditions.items() if key != name]

    by_state = db.execute(
        select(hazards.c.state, func.count()).where(*all_but("state")).group_by(hazards.c.state)
    ).all()
    attention = db.scalar(
        select(func.count())
        .select_from(hazards)
        .where(*all_but("needs_attention"), needs_attention(hazards))
    )
    return HazardSummary(
        by_state=HazardStateCounts(**{state: count for state, count in by_state}),
        needs_attention=attention or 0,
    )


def list_hazards(db: Session, params: HazardListParams) -> HazardList:
    season = latest_season(db)
    if season is None:
        empty = HazardSummary(by_state=HazardStateCounts(), needs_attention=0)
        return HazardList(season_year=None, total=0, summary=empty, items=[])

    hazards = _hazards(season)
    conditions = _conditions(hazards, params)
    filters = list(conditions.values())
    total = db.scalar(select(func.count()).select_from(hazards).where(*filters)) or 0
    reason_columns = [check(hazards).label(reason.value) for reason, check in ATTENTION_CHECKS]
    rows = db.execute(
        select(hazards, *reason_columns)
        .where(*filters)
        .order_by(hazards.c.asset_id)
        .limit(HAZARD_LIMIT)
    ).mappings()
    today = today_in_reporting_zone()
    return HazardList(
        season_year=season,
        total=total,
        summary=_summary(db, hazards, conditions),
        items=[
            HazardOut.model_validate(
                {
                    **row,
                    "age_days": age_in_days(row["inspected_at"], today),
                    "attention_reasons": [r for r, _ in ATTENTION_CHECKS if row[r.value]],
                }
            )
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
