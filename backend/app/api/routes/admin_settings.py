from fastapi import APIRouter, HTTPException, status

from app.api.deps import AdminUser, DbSession
from app.schemas.admin_settings import MessageList, MessageOut, MessageUpdate
from app.services.settings_service import (
    InvalidMessageError,
    MessageSetting,
    UnknownMessageError,
    get_message,
    list_messages,
    reset_message,
    save_message,
)

router = APIRouter(
    prefix="/admin/settings",
    tags=["admin"],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"},
        status.HTTP_403_FORBIDDEN: {"description": "Administrator access required"},
    },
)

_NOT_FOUND = {status.HTTP_404_NOT_FOUND: {"description": "No editable message has this key"}}


def _not_found() -> HTTPException:
    return HTTPException(
        status.HTTP_404_NOT_FOUND,
        {"code": "message_not_found", "message": "This message does not exist.", "field": None},
    )


def _out(setting: MessageSetting) -> MessageOut:
    return MessageOut.model_validate(setting)


@router.get("/messages", response_model=MessageList)
def get_messages(_admin: AdminUser, db: DbSession) -> MessageList:
    """List every editable message. Administrators only."""
    return MessageList(items=[_out(setting) for setting in list_messages(db)])


@router.get("/messages/{key}", response_model=MessageOut, responses=_NOT_FOUND)
def get_one_message(_admin: AdminUser, key: str, db: DbSession) -> MessageOut:
    """One editable message. Administrators only."""
    try:
        return _out(get_message(db, key))
    except UnknownMessageError:
        raise _not_found() from None


@router.put(
    "/messages/{key}",
    response_model=MessageOut,
    responses={
        **_NOT_FOUND,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"description": "The text breaks a rule"},
    },
)
def put_message(admin: AdminUser, key: str, payload: MessageUpdate, db: DbSession) -> MessageOut:
    """Save new text for a message. Administrators only."""
    try:
        return _out(save_message(db, admin, key, payload.message))
    except UnknownMessageError:
        raise _not_found() from None
    except InvalidMessageError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            {"code": "invalid_message", "message": str(exc), "field": "message"},
        ) from None


@router.delete("/messages/{key}", response_model=MessageOut, responses=_NOT_FOUND)
def delete_message(admin: AdminUser, key: str, db: DbSession) -> MessageOut:
    """Reset a message to its default. Safe to repeat. Administrators only."""
    try:
        return _out(reset_message(db, admin, key))
    except UnknownMessageError:
        raise _not_found() from None
