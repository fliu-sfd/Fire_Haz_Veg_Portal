import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import AppSetting, User
from app.schemas.validators import clean_message
from app.services.editable_messages import EDITABLE_MESSAGES, EditableMessage

logger = logging.getLogger(__name__)


class UnknownMessageError(Exception):
    pass


class InvalidMessageError(Exception):
    """The text breaks a rule. Carries the message to show."""


@dataclass(frozen=True)
class MessageSetting:
    key: str
    label: str
    description: str
    message: str
    default_message: str
    is_default: bool
    min_length: int
    max_length: int
    max_lines: int
    updated_at: datetime | None
    updated_by_name: str | None


def _spec(key: str) -> EditableMessage:
    try:
        return EDITABLE_MESSAGES[key]
    except KeyError:
        raise UnknownMessageError(key) from None


def _load(db: Session, specs: list[EditableMessage]) -> list[MessageSetting]:
    # Asking by registry key is what leaves out rows whose key is no longer in the registry.
    rows = db.execute(
        select(
            AppSetting.key,
            AppSetting.value,
            AppSetting.updated_at,
            User.full_name.label("updated_by_name"),
        )
        .select_from(AppSetting)
        .outerjoin(User, AppSetting.updated_by == User.id)
        .where(AppSetting.key.in_([spec.key for spec in specs]))
    ).all()
    saved = {row.key: row for row in rows}

    settings = []
    for spec in specs:
        row = saved.get(spec.key)
        message = row.value if row else spec.default
        settings.append(
            MessageSetting(
                key=spec.key,
                label=spec.label,
                description=spec.description,
                message=message,
                default_message=spec.default,
                is_default=message == spec.default,
                min_length=spec.min_length,
                max_length=spec.max_length,
                max_lines=spec.max_lines,
                updated_at=row.updated_at if row else None,
                updated_by_name=row.updated_by_name if row else None,
            )
        )
    return settings


def list_messages(db: Session) -> list[MessageSetting]:
    return _load(db, list(EDITABLE_MESSAGES.values()))


def get_message(db: Session, key: str) -> MessageSetting:
    return _load(db, [_spec(key)])[0]


def save_message(db: Session, admin: User, key: str, text: str) -> MessageSetting:
    spec = _spec(key)
    try:
        cleaned = clean_message(text, spec)
    except ValueError as exc:
        raise InvalidMessageError(str(exc)) from None

    # An upsert, so two admins saving a new message at once cannot collide on the primary key.
    # updated_at is set here because an update with the same text would not trigger onupdate.
    values = {"value": cleaned, "updated_at": datetime.now(UTC), "updated_by": admin.id}
    db.execute(
        insert(AppSetting)
        .values(key=key, **values)
        .on_conflict_do_update(index_elements=[AppSetting.key], set_=values)
    )
    db.commit()
    # never the text: the key is enough to find the change
    logger.info("admin %s saved message %s", admin.id, key)
    return get_message(db, key)


def reset_message(db: Session, admin: User, key: str) -> MessageSetting:
    """Delete the saved text so the default applies again. Quiet if nothing was saved."""
    _spec(key)
    db.execute(delete(AppSetting).where(AppSetting.key == key))
    db.commit()
    logger.info("admin %s reset message %s", admin.id, key)
    return get_message(db, key)


def message_text(db: Session, key: str) -> str:
    """The text in effect. Other parts of the app call this instead of writing the text in code."""
    spec = _spec(key)
    saved = db.scalar(select(AppSetting.value).where(AppSetting.key == key))
    return spec.default if saved is None else saved
