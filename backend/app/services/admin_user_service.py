import logging
import uuid

from sqlalchemy import ColumnElement, String, cast, exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import FirefighterProfile, ResidentAsset, User, UserRole
from app.schemas.admin import (
    AdminUserDetail,
    AdminUserList,
    AdminUserOut,
    AdminUserUpdate,
    FirefighterOut,
    SortOrder,
    UserListParams,
    UserSortField,
)
from app.services.property_service import link_user_to_property, resolve_property
from app.services.text_search import LIKE_ESCAPE, like_pattern
from app.services.user_service import PropertyNotFoundError, get_user_by_email

logger = logging.getLogger(__name__)


class UserNotFoundError(Exception):
    pass


class EmailTakenError(Exception):
    pass


class EmployeeIdTakenError(Exception):
    pass


class FirefighterDetailsRequiredError(Exception):
    pass


class FirefighterNotApplicableError(Exception):
    pass


class UnlinkAssetsFirstError(Exception):
    pass


class CannotChangeOwnAccessError(Exception):
    pass


class LastAdminError(Exception):
    pass


class AssetsResidentsOnlyError(Exception):
    pass


def _filters(params: UserListParams) -> list[ColumnElement[bool]]:
    filters: list[ColumnElement[bool]] = []
    if params.role is not None:
        filters.append(User.role == params.role)
    if params.is_active is not None:
        filters.append(User.is_active.is_(params.is_active))
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
    if field is UserSortField.LAST_LOGIN_AT:
        # never signed in is null, and nulls_last() in list_users keeps it last both ways
        return User.last_login_at
    if field is UserSortField.IS_ACTIVE:
        return User.is_active
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


def user_detail(user: User) -> AdminUserDetail:
    profile = user.firefighter_profile
    return AdminUserDetail(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        asset_ids=sorted(link.asset_id for link in user.resident_assets),
        firefighter=(
            FirefighterOut(employee_id=profile.employee_id, station_code=profile.station_code)
            if profile is not None
            else None
        ),
    )


def _get_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError
    return user


def get_user_detail(db: Session, user_id: uuid.UUID) -> AdminUserDetail:
    return user_detail(_get_user(db, user_id))


def _employee_id_taken(db: Session, user: User, employee_id: str) -> bool:
    return bool(
        db.scalar(
            select(
                exists().where(
                    FirefighterProfile.employee_id == employee_id,
                    FirefighterProfile.user_id != user.id,
                )
            )
        )
    )


def _check_access_change(db: Session, admin: User, user: User, data: AdminUserUpdate) -> None:
    sent = data.model_fields_set
    new_role = data.role if "role" in sent else user.role
    new_active = data.is_active if "is_active" in sent else user.is_active
    if new_role is user.role and new_active is user.is_active:
        return

    if user.role is UserRole.ADMIN and user.is_active:
        # lock every active admin row until commit, so two admins demoting each other
        # at the same moment are counted one after the other
        active_admins = db.scalars(
            select(User.id)
            .where(User.role == UserRole.ADMIN, User.is_active.is_(True))
            .with_for_update()
        ).all()
        if len(active_admins) <= 1:
            raise LastAdminError
    if user.id == admin.id:
        raise CannotChangeOwnAccessError


def _check_rules(db: Session, user: User, data: AdminUserUpdate) -> None:
    sent = data.model_fields_set
    new_role = data.role if "role" in sent else user.role

    if "firefighter" in sent and new_role is not UserRole.FIREFIGHTER:
        raise FirefighterNotApplicableError
    if (
        "role" in sent
        and new_role is UserRole.FIREFIGHTER
        and user.firefighter_profile is None
        and "firefighter" not in sent
    ):
        raise FirefighterDetailsRequiredError
    if (
        user.role is UserRole.RESIDENT
        and new_role is not UserRole.RESIDENT
        and user.resident_assets
    ):
        raise UnlinkAssetsFirstError

    if "email" in sent:
        other = get_user_by_email(db, data.email)
        if other is not None and other.id != user.id:
            raise EmailTakenError
    if "firefighter" in sent and _employee_id_taken(db, user, data.firefighter.employee_id):
        raise EmployeeIdTakenError


def _apply(user: User, data: AdminUserUpdate) -> list[str]:
    """Copy the sent values onto the user. Returns the names of the fields that changed."""
    changed = []
    for field in ("full_name", "email", "phone", "role", "is_active"):
        if field in data.model_fields_set and getattr(data, field) != getattr(user, field):
            setattr(user, field, getattr(data, field))
            changed.append(field)

    if "firefighter" in data.model_fields_set:
        wanted = data.firefighter
        profile = user.firefighter_profile
        if profile is None:
            user.firefighter_profile = FirefighterProfile(
                employee_id=wanted.employee_id, station_code=wanted.station_code
            )
            changed.append("firefighter")
        elif (profile.employee_id, profile.station_code) != (
            wanted.employee_id,
            wanted.station_code,
        ):
            # a returning firefighter keeps their old row, updated with what was sent
            profile.employee_id = wanted.employee_id
            profile.station_code = wanted.station_code
            changed.append("firefighter")
    return changed


def update_user(
    db: Session, admin: User, user_id: uuid.UUID, data: AdminUserUpdate
) -> AdminUserDetail:
    user = _get_user(db, user_id)
    _check_access_change(db, admin, user, data)
    _check_rules(db, user, data)
    changed = _apply(user, data)
    if not changed:
        return user_detail(user)

    try:
        db.commit()
    except IntegrityError as exc:
        # another edit took the email or employee id after the checks above
        db.rollback()
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint == "uq_firefighter_profiles_employee_id":
            raise EmployeeIdTakenError from exc
        if constraint == "uq_users_email_lower":
            raise EmailTakenError from exc
        raise
    db.refresh(user)
    # field names only: values such as email and phone stay out of the logs
    logger.info("admin %s updated user %s: %s", admin.id, user.id, ", ".join(changed))
    return user_detail(user)


def _get_resident(db: Session, user_id: uuid.UUID) -> User:
    user = _get_user(db, user_id)
    if user.role is not UserRole.RESIDENT:
        raise AssetsResidentsOnlyError
    return user


def link_asset(db: Session, admin: User, user_id: uuid.UUID, asset_id: str) -> AdminUserDetail:
    """Link a resident to an asset. Linking one already linked changes nothing."""
    user = _get_resident(db, user_id)
    stored_id = resolve_property(db, asset_id)
    if stored_id is None:
        raise PropertyNotFoundError
    if stored_id in {link.asset_id for link in user.resident_assets}:
        return user_detail(user)

    link_user_to_property(db, user, stored_id)
    db.commit()
    db.refresh(user)
    logger.info("admin %s updated user %s: asset_ids", admin.id, user.id)
    return user_detail(user)


def unlink_asset(db: Session, admin: User, user_id: uuid.UUID, asset_id: str) -> AdminUserDetail:
    """Remove a resident's link to an asset. Removing one not linked changes nothing."""
    user = _get_resident(db, user_id)
    wanted = asset_id.strip().lower()
    links = [link for link in user.resident_assets if link.asset_id.lower() == wanted]
    if not links:
        return user_detail(user)

    for link in links:
        user.resident_assets.remove(link)
    db.commit()
    db.refresh(user)
    logger.info("admin %s updated user %s: asset_ids", admin.id, user.id)
    return user_detail(user)
