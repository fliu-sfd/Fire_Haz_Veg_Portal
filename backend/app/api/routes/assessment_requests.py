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
    return create_request(db, user, asset_id, payload.note)


@router.get("/admin/assessment-requests", response_model=AssessmentRequestListOut)
def get_requests(
    _user: AdminUser,
    db: DbSession,
    request_status: Literal["open", "handled"] | None = Query(None, alias="status"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return list_requests(db, request_status, limit, offset)


@router.post(
    "/admin/assessment-requests/{request_id}/handle",
    response_model=AdminAssessmentRequestOut,
)
def post_handle_request(request_id: uuid.UUID, user: AdminUser, db: DbSession):
    return handle_request(db, user, request_id)
