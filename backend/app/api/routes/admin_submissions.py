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
    return PendingReviewCount(pending=pending_count(db))


@router.get("", response_model=ReviewInboxOut)
def get_review_inbox(
    _user: AdminUser,
    db: DbSession,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return review_inbox(db, limit, offset)


@router.post("/{submission_id}/review", response_model=SubmissionOut)
def post_review(
    submission_id: uuid.UUID,
    decision: ReviewDecision,
    user: AdminUser,
    db: DbSession,
):
    return review_submission(db, user, submission_id, decision)


@router.get("/{submission_id}", response_model=ReviewDetailOut)
def get_review_detail(submission_id: uuid.UUID, user: AdminUser, db: DbSession):
    return review_detail(db, user, submission_id)
