import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.formparsers import MultiPartException

from app.api.deps import CurrentUser, DbSession, PhotoStoreDep, ResidentUser
from app.models import Submission, SubmissionPhoto
from app.schemas.submissions import SubmissionOut
from app.services.submission_service import (
    MAX_COMMENT_LENGTH,
    MAX_PHOTO_BYTES,
    MAX_PHOTOS,
    create_submission,
    editable_submission,
    evidence_assessment,
    list_submissions,
    require_uploadable,
    submission_out,
    update_submission,
    validate_photo,
)

router = APIRouter(tags=["homeowner evidence"])
MAX_UPLOAD_BYTES = MAX_PHOTOS * MAX_PHOTO_BYTES + 64 * 1024
TOTAL_SIZE_ERROR = "The upload exceeds the total size limit. Use up to five photos, 5 MB each."


class BoundedUploadRequest(Request):
    """Bound streamed bodies too, including requests without Content-Length.

    MultiPartException lets Starlette close temporary files before rejecting the request.
    """

    async def stream(self) -> AsyncIterator[bytes]:
        received = 0
        async for chunk in super().stream():
            received += len(chunk)
            if received > MAX_UPLOAD_BYTES:
                raise MultiPartException(TOTAL_SIZE_ERROR)
            yield chunk


@router.post(
    "/assessments/{assessment_id}/submissions",
    response_model=SubmissionOut,
    status_code=201,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["photos"],
                        "properties": {
                            "photos": {
                                "type": "array",
                                "minItems": 1,
                                "maxItems": MAX_PHOTOS,
                                "items": {"type": "string", "format": "binary"},
                            },
                            "comment": {"type": "string", "maxLength": MAX_COMMENT_LENGTH},
                        },
                    },
                }
            },
        }
    },
)
async def post_submission(
    assessment_id: uuid.UUID,
    request: Request,
    user: ResidentUser,
    db: DbSession,
    store: PhotoStoreDep,
) -> SubmissionOut:
    # Authentication and assessment access precede parsing or decoding any upload.
    assessment = await run_in_threadpool(evidence_assessment, db, user, assessment_id)
    await run_in_threadpool(require_uploadable, db, assessment)
    photos, comment = await read_upload(request)
    return await run_in_threadpool(create_submission, db, store, assessment, user, photos, comment)


@router.patch(
    "/assessments/{assessment_id}/submissions/{submission_id}", response_model=SubmissionOut
)
async def patch_submission(
    assessment_id: uuid.UUID,
    submission_id: uuid.UUID,
    request: Request,
    user: ResidentUser,
    db: DbSession,
    store: PhotoStoreDep,
) -> SubmissionOut:
    submission = await run_in_threadpool(
        editable_submission, db, user, assessment_id, submission_id
    )
    photos, comment = await read_upload(request, require_photos=False)
    return await run_in_threadpool(update_submission, db, store, submission, user, photos, comment)


async def read_upload(request: Request, *, require_photos: bool = True):
    if request.headers.get("content-type", "").split(";", 1)[0].lower() != "multipart/form-data":
        raise HTTPException(415, "Send photos using multipart/form-data.")
    length = request.headers.get("content-length")
    if length and length.isdecimal() and int(length) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, TOTAL_SIZE_ERROR)
    bounded = BoundedUploadRequest(request.scope, request.receive)
    try:
        async with bounded.form(
            max_files=MAX_PHOTOS,
            max_fields=1,
            max_part_size=MAX_COMMENT_LENGTH * 4,
        ) as form:
            files = form.getlist("photos")
            if set(form) - {"photos", "comment"}:
                raise HTTPException(422, "Only photos and an optional comment are accepted.")
            if not (1 if require_photos else 0) <= len(files) <= MAX_PHOTOS or not all(
                isinstance(f, UploadFile) for f in files
            ):
                raise HTTPException(422, "Attach between one and five photos.")
            comment = form.get("comment", "")
            if not isinstance(comment, str) or len(comment) > MAX_COMMENT_LENGTH:
                raise HTTPException(422, "The comment must be 2,000 characters or fewer.")
            photos = []
            for file in files:
                data = await file.read(MAX_PHOTO_BYTES + 1)
                photos.append(
                    await run_in_threadpool(
                        validate_photo,
                        data,
                        file.content_type,
                        file.filename,
                    )
                )
            return photos, comment.strip() or None
    except StarletteHTTPException as exc:
        if exc.status_code == 400 and exc.detail == TOTAL_SIZE_ERROR:
            raise HTTPException(413, TOTAL_SIZE_ERROR) from exc
        raise


@router.get("/assessments/{assessment_id}/submissions", response_model=list[SubmissionOut])
def get_submissions(assessment_id: uuid.UUID, user: CurrentUser, db: DbSession):
    evidence_assessment(db, user, assessment_id)
    return [
        submission_out(row, user, is_latest=index == 0)
        for index, row in enumerate(list_submissions(db, assessment_id))
    ]


@router.get("/submission-photos/{photo_id}")
def get_submission_photo(
    photo_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    store: PhotoStoreDep,
) -> Response:
    photo = db.get(SubmissionPhoto, photo_id)
    submission = db.get(Submission, photo.submission_id) if photo else None
    if submission is None:
        raise HTTPException(404, "Photo not found.")
    evidence_assessment(db, user, submission.assessment_id)
    try:
        data = store.read(photo.storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(404, "Photo not found.") from exc
    return Response(
        data,
        media_type=photo.content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    )
