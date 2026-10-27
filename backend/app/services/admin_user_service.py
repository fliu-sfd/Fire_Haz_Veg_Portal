from sqlalchemy import ColumnElement, String, cast, exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import ResidentAsset, User
from app.schemas.admin import AdminUserList, AdminUserOut, SortOrder, UserListParams, UserSortField
from app.services.text_search import LIKE_ESCAPE, like_pattern


def _filters(params: UserListParams) -> list[ColumnElement[bool]]:
    filters: list[ColumnElement[bool]] = []
    if params.role is not None:
        filters.append(User.role == params.role)
    if params.q:
        pattern = like_pattern(params.q)
        asset_match = exists().where(
            ResidentAsset.user_id == User.id,
            ResidentAsset.asset_id.ilike(pattern, escape=LIKE_ESCAPE),
        )
        filters.append(
            or_(
                User.full_name.ilike(pattern, escape=LIKE_ESCAPE),
                User.email.ilike(pattern, escape=LIKE_ESCAPE),
                asset_match,
            )
        )
    return filters


def _sort_key(field: UserSortField) -> ColumnElement:
    if field is UserSortField.FULL_NAME:
        return func.lower(User.full_name)
    if field is UserSortField.EMAIL:
        return func.lower(User.email)
    if field is UserSortField.ROLE:
        # alphabetical (admin, firefighter, resident), not the enum's declared order
        return cast(User.role, String)
    if field is UserSortField.ASSET_IDS:
        # users sort by their lowest asset id; staff with none go last
        return (
            select(func.min(ResidentAsset.asset_id))
            .where(ResidentAsset.user_id == User.id)
            .correlate(User)
            .scalar_subquery()
        )
    return User.created_at


def list_users(db: Session, params: UserListParams) -> AdminUserList:
    filters = _filters(params)
    total = db.scalar(select(func.count()).select_from(User).where(*filters)) or 0

    key = _sort_key(params.sort)
    key = key.asc() if params.order is SortOrder.ASC else key.desc()
    users = db.scalars(
        select(User)
        .where(*filters)
        # id breaks ties so paging never repeats or skips a row
        .order_by(key.nulls_last(), User.id)
        .limit(params.limit)
        .offset(params.offset)
        .options(selectinload(User.resident_assets))
    ).all()

    items = [
        AdminUserOut(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role,
            asset_ids=sorted(link.asset_id for link in u.resident_assets),
            created_at=u.created_at,
            is_active=u.is_active,
            last_login_at=u.last_login_at,
        )
        for u in users
    ]
    return AdminUserList(items=items, total=total, limit=params.limit, offset=params.offset)
