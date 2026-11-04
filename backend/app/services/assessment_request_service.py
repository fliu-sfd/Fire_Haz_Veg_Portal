import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.models import FullAssessmentRequest, ResidentAsset, User
from app.schemas.assessment_requests import (
    AdminAssessmentRequestOut,
    AssessmentRequestListOut,
)


def linked_asset_id(db: Session, user: User, asset_id: str) -> str:
    stored_id = db.scalar(
        select(ResidentAsset.asset_id).where(
            ResidentAsset.user_id == user.id,
            func.lower(ResidentAsset.asset_id) == asset_id.strip().lower(),
        )
    )
    if stored_id is None:
        # Do not reveal whether an unlinked Asset ID exists.
        raise HTTPException(404, "Property not found.")
    return stored_id


def open_request(db: Session, asset_id: str) -> FullAssessmentRequest | None:
    return db.scalar(
        select(FullAssessmentRequest).where(
            func.lower(FullAssessmentRequest.asset_id) == asset_id.lower(),
            FullAssessmentRequest.handled_at.is_(None),
        )
    )


def homeowner_open_request(db: Session, user: User, asset_id: str) -> FullAssessmentRequest | None:
    return open_request(db, linked_asset_id(db, user, asset_id))


def create_request(
    db: Session, user: User, asset_id: str, note: str | None
) -> FullAssessmentRequest:
    stored_id = linked_asset_id(db, user, asset_id)
    existing = open_request(db, stored_id)
    if existing is not None:
        return existing

    row = FullAssessmentRequest(asset_id=stored_id, homeowner_id=user.id, note=note)
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint != "uq_full_assessment_requests_open_asset":
            raise
        existing = open_request(db, stored_id)
        if existing is None:
            raise
        return existing
    db.refresh(row)
    return row


def list_requests(
    db: Session,
    request_status: Literal["open", "handled"] | None,
    limit: int,
    offset: int,
) -> AssessmentRequestListOut:
    homeowner = aliased(User)
    handler = aliased(User)
    conditions = []
    if request_status == "open":
        conditions.append(FullAssessmentRequest.handled_at.is_(None))
    elif request_status == "handled":
        conditions.append(FullAssessmentRequest.handled_at.is_not(None))

    total = (
        db.scalar(select(func.count()).select_from(FullAssessmentRequest).where(*conditions)) or 0
    )
    rows = db.execute(
        select(FullAssessmentRequest, homeowner.full_name, handler.full_name)
        .outerjoin(homeowner, homeowner.id == FullAssessmentRequest.homeowner_id)
        .outerjoin(handler, handler.id == FullAssessmentRequest.handled_by)
        .where(*conditions)
        .order_by(
            FullAssessmentRequest.handled_at.is_not(None),
            FullAssessmentRequest.requested_at.desc(),
            FullAssessmentRequest.id,
        )
        .limit(limit)
        .offset(offset)
    ).all()
    return AssessmentRequestListOut(
        items=[
            AdminAssessmentRequestOut(
                id=row.id,
                asset_id=row.asset_id,
                note=row.note,
                requested_at=row.requested_at,
                status=row.status,
                handled_at=row.handled_at,
                homeowner_name=homeowner_name or "Former homeowner",
                handled_by_name=handler_name,
            )
            for row, homeowner_name, handler_name in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


def handle_request(db: Session, admin: User, request_id: uuid.UUID) -> AdminAssessmentRequestOut:
    row = db.scalar(
        select(FullAssessmentRequest)
        .where(FullAssessmentRequest.id == request_id)
        .with_for_update()
    )
    if row is None:
        raise HTTPException(404, "Assessment request not found.")
    if row.handled_at is not None:
        raise HTTPException(409, "This assessment request has already been handled.")

    row.handled_at = datetime.now(UTC)
    row.handled_by = admin.id
    db.commit()
    result = db.execute(
        select(FullAssessmentRequest, User.full_name)
        .outerjoin(User, User.id == FullAssessmentRequest.homeowner_id)
        .where(FullAssessmentRequest.id == row.id)
    ).one()
    return AdminAssessmentRequestOut(
        id=result[0].id,
        asset_id=result[0].asset_id,
        note=result[0].note,
        requested_at=result[0].requested_at,
        status=result[0].status,
        handled_at=result[0].handled_at,
        homeowner_name=result[1] or "Former homeowner",
        handled_by_name=admin.full_name,
    )
