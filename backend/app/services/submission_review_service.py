"""Department review of the current evidence for an inspection point."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.models import Assessment, Submission, User
from app.schemas.submissions import ReviewDecision, ReviewInboxItem, ReviewInboxOut, SubmissionOut
from app.services.submission_service import (
    latest_submission_id,
    require_uploadable,
    submission_out,
)


def pending_conditions():
    other_point = aliased(Assessment)
    latest_year = (
        select(func.max(other_point.season_year))
        .where(func.lower(other_point.asset_id) == func.lower(Assessment.asset_id))
        .correlate(Assessment)
        .scalar_subquery()
    )
    latest_id = (
        select(Submission.id)
        .where(Submission.assessment_id == Assessment.id)
        .order_by(Submission.created_at.desc(), Submission.id)
        .limit(1)
        .correlate(Assessment)
        .scalar_subquery()
    )
    return (
        Submission.status == "pending_review",
        Submission.id == latest_id,
        Assessment.season_year == latest_year,
        Assessment.status == "ISSUES",
    )


def pending_count(db: Session) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Submission)
            .join(Assessment, Assessment.id == Submission.assessment_id)
            .where(*pending_conditions())
        )
        or 0
    )


def review_inbox(db: Session, limit: int, offset: int) -> ReviewInboxOut:
    rows = db.execute(
        select(Submission, Assessment.asset_id, Assessment.site_address, User.full_name)
        .join(Assessment, Assessment.id == Submission.assessment_id)
        .outerjoin(User, User.id == Submission.homeowner_id)
        .options(selectinload(Submission.photos))
        .where(*pending_conditions())
        .order_by(Submission.created_at, Submission.id)
        .limit(limit)
        .offset(offset)
    ).all()
    return ReviewInboxOut(
        items=[
            ReviewInboxItem(
                submission_id=row.id,
                assessment_id=row.assessment_id,
                asset_id=asset,
                site_address=address,
                homeowner_name=name or "Former homeowner",
                created_at=row.created_at,
                updated_at=row.updated_at,
                photo_count=len(row.photos),
            )
            for row, asset, address, name in rows
        ],
        total=pending_count(db),
        limit=limit,
        offset=offset,
    )


def review_submission(
    db: Session,
    user: User,
    submission_id: uuid.UUID,
    decision: ReviewDecision,
) -> SubmissionOut:
    original = db.get(Submission, submission_id)
    if original is None:
        raise HTTPException(404, "Submission not found.")
    assessment_id = original.assessment_id
    # All evidence writes lock the assessment before locking/updating a submission.
    assessment = db.scalar(
        select(Assessment).where(Assessment.id == assessment_id).with_for_update()
    )
    row = db.scalar(
        select(Submission)
        .where(Submission.id == submission_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if row is None or row.status != "pending_review":
        raise HTTPException(
            409, "This submission has already been reviewed. Refresh the assessment."
        )
    if latest_submission_id(db, assessment_id) != row.id:
        raise HTTPException(409, "A newer submission exists. Review the latest evidence instead.")
    require_uploadable(db, assessment)
    if row.version != decision.expected_version:
        raise HTTPException(
            409,
            "The homeowner changed this evidence. "
            "Refresh and review the updated submission before deciding.",
        )
    row.status = decision.decision
    row.review_comment = decision.comment
    row.reviewed_by = user.id
    row.reviewed_at = datetime.now(UTC)
    row.version += 1
    db.flush()
    result = submission_out(row, user)
    db.commit()
    return result
