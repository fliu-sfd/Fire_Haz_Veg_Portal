"""Full assessment requests: a homeowner asks the department to assess a property, and an
admin marks the request handled.
"""

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query

from app.api.deps import AdminUser, DbSession, ResidentUser
from app.schemas.assessment_requests import (
    AdminAssessmentRequestOut,
    AssessmentRequestCreate,
    AssessmentRequestListOut,
    AssessmentRequestOut,
)
from app.schemas.validators import ASSET_ID_MAX_LENGTH
from app.services.assessment_request_service import (
    create_request,
    handle_request,
    homeowner_open_request,
    list_requests,
)

router = APIRouter(tags=["full assessment requests"])


@router.get(
    "/residents/me/properties/{asset_id}/assessment-requests/open",
    response_model=AssessmentRequestOut | None,
)
def get_open_request(
    asset_id: Annotated[str, Path(max_length=ASSET_ID_MAX_LENGTH)],
    user: ResidentUser,
    db: DbSession,
):
    """The open request for one of the homeowner's linked properties, or null.

    An Asset ID that is not on the account is a 404.
    """
    return homeowner_open_request(db, user, asset_id)


@router.post(
    "/residents/me/properties/{asset_id}/assessment-requests",
    response_model=AssessmentRequestOut,
)
def post_request(
    asset_id: Annotated[str, Path(max_length=ASSET_ID_MAX_LENGTH)],
    payload: AssessmentRequestCreate,
    user: ResidentUser,
    db: DbSession,
):
    """Ask for a full assessment of a linked property, with an optional note.

    If a request for the property is already open, that one is returned instead.
    """
    return create_request(db, user, asset_id, payload.note)


@router.get("/admin/assessment-requests", response_model=AssessmentRequestListOut)
def get_requests(
    _user: AdminUser,
    db: DbSession,
    request_status: Literal["open", "handled"] | None = Query(None, alias="status"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """All requests, open first and then newest first. Administrators only.

    status=open or status=handled narrows the list.
    """
    return list_requests(db, request_status, limit, offset)


@router.post(
    "/admin/assessment-requests/{request_id}/handle",
    response_model=AdminAssessmentRequestOut,
)
def post_handle_request(request_id: uuid.UUID, user: AdminUser, db: DbSession):
    """Mark a request handled and record which admin did it. Administrators only.

    An unknown request is a 404, and one already handled is a 409.
    """
    return handle_request(db, user, request_id)
