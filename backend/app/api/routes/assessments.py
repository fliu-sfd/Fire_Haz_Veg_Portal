import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentUser, DbSession, PhotoStoreDep
from app.schemas.assessments import PropertyAssessmentOut
from app.services.assessment_service import (
    AssessmentNotFoundError,
    CrewPhotoNotFoundError,
    get_crew_photo,
    get_latest_property_assessment,
)

router = APIRouter(
    prefix="/assessments",
    tags=["assessments"],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated"}},
)


@router.get(
    "/photos/{photo_id}",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Photo not found"}},
)
def crew_photo(
    photo_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    photo_store: PhotoStoreDep,
) -> Response:
    """Serve a crew photo only when the signed-in user may view its assessment."""
    try:
        photo = get_crew_photo(db, user, photo_id)
        content = photo_store.read(photo.storage_key)
    except (CrewPhotoNotFoundError, FileNotFoundError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found") from None

    return Response(
        content=content,
        media_type=photo.content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/{asset_id}",
    response_model=PropertyAssessmentOut,
    responses={status.HTTP_404_NOT_FOUND: {"description": "Assessment not found"}},
)
def property_assessment(
    asset_id: str,
    user: CurrentUser,
    db: DbSession,
) -> PropertyAssessmentOut:
    """Latest-season inspection points for an asset the signed-in user may view."""
    try:
        result = get_latest_property_assessment(db, user, asset_id)
    except AssessmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found") from None
    return PropertyAssessmentOut.model_validate(result)
