"""A resident adding and removing properties on their own account."""

import logging

from sqlalchemy import exists, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import ResidentAsset, User
from app.services.property_service import (
    PropertyNotFoundError,
    PropertySummary,
    link_user_to_property,
    list_user_properties,
    resolve_property,
)

logger = logging.getLogger(__name__)

# limits how much a stolen or curious account can collect
MAX_LINKED_PROPERTIES = 25


class AlreadyLinkedError(Exception):
    pass


class TooManyPropertiesError(Exception):
    pass


class LinkNotAllowedError(Exception):
    pass


def can_link(db: Session, user: User, asset_id: str) -> bool:
    """The one rule for whether this person may link this asset.

    The door tag is the proof, and two owners of one house both need access, so today the
    answer is always yes, even when another account already has the asset. The later claim
    system (a new owner requests the asset and an admin approves) changes only this function
    and adds its own endpoint.
    """
    return True


def _on_another_account(db: Session, user: User, asset_id: str) -> bool:
    return bool(
        db.scalar(
            select(
                exists().where(
                    ResidentAsset.user_id != user.id,
                    func.lower(ResidentAsset.asset_id) == asset_id.lower(),
                )
            )
        )
    )


def add_property(db: Session, user: User, asset_id: str) -> list[PropertySummary]:
    """Link an asset to the resident's account and return their updated list."""
    stored_id = resolve_property(db, asset_id)
    if stored_id is None:
        raise PropertyNotFoundError

    # one link at a time per account, so parallel requests cannot pass the limit together.
    # key_share leaves other transactions free to reference this user row.
    db.execute(select(User.id).where(User.id == user.id).with_for_update(key_share=True))
    linked = db.scalars(select(ResidentAsset.asset_id).where(ResidentAsset.user_id == user.id))
    linked = [value.lower() for value in linked]
    if stored_id.lower() in linked:
        raise AlreadyLinkedError
    if len(linked) >= MAX_LINKED_PROPERTIES:
        raise TooManyPropertiesError
    if not can_link(db, user, stored_id):
        raise LinkNotAllowedError

    shared = _on_another_account(db, user, stored_id)
    try:
        link_user_to_property(db, user, stored_id)
        db.commit()
    except IntegrityError as exc:
        # an admin linked the same asset after the check above
        db.rollback()
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint == "uq_resident_assets_user_asset":
            raise AlreadyLinkedError from exc
        raise
    db.refresh(user)
    logger.info("resident %s linked asset %s", user.id, stored_id)
    if shared:
        # shows how often this happens, before anyone decides a claim system is worth building
        logger.info("resident %s linked asset %s already on another account", user.id, stored_id)
    return list_user_properties(db, user)


def remove_property(db: Session, user: User, asset_id: str) -> list[PropertySummary]:
    """Remove an asset from the resident's account. Removing one not linked changes nothing.

    Assessments, photos and hazards belong to the asset, so they stay.
    """
    wanted = asset_id.strip().lower()
    links = [link for link in user.resident_assets if link.asset_id.lower() == wanted]
    if links:
        # the stored id, not the raw path value, goes in the log
        removed = [link.asset_id for link in links]
        for link in links:
            user.resident_assets.remove(link)
        db.commit()
        db.refresh(user)
        for stored_id in removed:
            logger.info("resident %s unlinked asset %s", user.id, stored_id)
    return list_user_properties(db, user)
