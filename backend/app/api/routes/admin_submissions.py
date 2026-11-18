"""Admin review of homeowner completion photos: inbox, count, detail and decision."""

import uuid

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, DbSession
from app.schemas.submissions import (
    PendingReviewCount,
    ReviewDecision,
    ReviewDetailOut,
    ReviewInboxOut,
    SubmissionOut,
)
from app.services.submission_review_service import (
    pending_count,
    review_detail,
    review_inbox,
    review_submission,
)

router = APIRouter(prefix="/admin/submissions", tags=["admin review"])


@router.get("/count", response_model=PendingReviewCount)
def get_pending_count(_user: AdminUser, db: DbSession):
    """How many submissions wait in the review inbox (the sidebar count). Administrators only."""
    return PendingReviewCount(pending=pending_count(db))


@router.get("", response_model=ReviewInboxOut)
def get_review_inbox(
    _user: AdminUser,
    db: DbSession,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Pending submissions, oldest first. Administrators only.

    Only the newest evidence on an issue point of the latest season is listed.
    """
    return review_inbox(db, limit, offset)


@router.post("/{submission_id}/review", response_model=SubmissionOut)
def post_review(
    submission_id: uuid.UUID,
    decision: ReviewDecision,
    user: AdminUser,
    db: DbSession,
):
    """Approve or send back a submission. Administrators only.

    Sending back needs a comment. expected_version must match the submission's version,
    or the answer is 409, so a decision is never made on evidence that has since changed.
    """
    return review_submission(db, user, submission_id, decision)


@router.get("/{submission_id}", response_model=ReviewDetailOut)
def get_review_detail(submission_id: uuid.UUID, user: AdminUser, db: DbSession):
    """One submission with its inspection point and evidence history. Administrators only.

    Reviewed, older and past-season submissions are still returned, with can_review false.
    """
    return review_detail(db, user, submission_id)
