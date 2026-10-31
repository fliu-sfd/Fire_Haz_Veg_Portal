import logging
import uuid
import warnings
from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Assessment, Submission, SubmissionPhoto, User, UserRole
from app.schemas.submissions import SubmissionOut
from app.services.property_service import can_view_assessment
from app.storage.base import PhotoStore

logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTOS = 5
MAX_COMMENT_LENGTH = 2000
MAX_IMAGE_PIXELS = 25_000_000
IMAGE_TYPES = {"JPEG": ("image/jpeg", "jpg"), "PNG": ("image/png", "png")}


@dataclass(frozen=True)
class ValidatedPhoto:
    data: bytes
    file_name: str
    content_type: str
    extension: str


def validate_photo(data: bytes, content_type: str | None, file_name: str | None) -> ValidatedPhoto:
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Each photo must be 5 MB or smaller.")
    if not data:
        raise HTTPException(422, "Photos must not be empty.")
    if content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(415, "Only JPEG and PNG photos are accepted.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                image_type = IMAGE_TYPES.get(image.format)
                if image_type is None or image_type[0] != content_type:
                    raise HTTPException(415, "The photo contents must match its JPEG or PNG type.")
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise HTTPException(422, "Photos must be no larger than 25 megapixels.")
                image.verify()
            # verify() checks structure; decoding also rejects truncated image data.
            with Image.open(BytesIO(data)) as image:
                image.load()
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(422, "Photos must be no larger than 25 megapixels.") from exc
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise HTTPException(
            422, "This photo could not be read. Choose a valid JPEG or PNG."
        ) from exc

    # Original names are display metadata only, never filesystem paths or response headers.
    name = (file_name or "photo").replace("\\", "/").rsplit("/", 1)[-1]
    name = "".join(char for char in name if char.isprintable())[:255] or "photo"
    return ValidatedPhoto(data, name, image_type[0], image_type[1])


def evidence_assessment(db: Session, user: User, assessment_id: uuid.UUID) -> Assessment:
    assessment = db.get(Assessment, assessment_id)
    if assessment is None or not can_view_assessment(db, user, assessment):
        raise HTTPException(404, "Assessment not found.")
    return assessment


def require_uploadable(db: Session, assessment: Assessment) -> None:
    if assessment.status != "ISSUES":
        raise HTTPException(409, "Photos can only be submitted for an assessment with issues.")
    latest = db.scalar(
        select(func.max(Assessment.season_year)).where(
            func.lower(Assessment.asset_id) == assessment.asset_id.lower()
        )
    )
    if assessment.season_year != latest:
        raise HTTPException(409, "Open the latest inspection season to submit completion photos.")


def latest_submission_id(db: Session, assessment_id: uuid.UUID) -> uuid.UUID | None:
    return db.scalar(
        select(Submission.id)
        .where(Submission.assessment_id == assessment_id)
        .order_by(Submission.created_at.desc(), Submission.id)
        .limit(1)
    )


def list_submissions(db: Session, assessment_id: uuid.UUID) -> list[Submission]:
    return list(
        db.scalars(
            select(Submission)
            .where(Submission.assessment_id == assessment_id)
            .options(selectinload(Submission.photos))
            .order_by(Submission.created_at.desc(), Submission.id)
        )
    )


def submission_out(submission: Submission, user: User, *, is_latest: bool = True) -> SubmissionOut:
    own = submission.homeowner_id == user.id
    return SubmissionOut.model_validate(submission).model_copy(
        update={
            "is_own_submission": own,
            "can_edit": own
            and user.role == UserRole.RESIDENT
            and submission.status == "pending_review"
            and is_latest,
            "can_review": user.role == UserRole.ADMIN
            and submission.status == "pending_review"
            and is_latest,
        }
    )


def editable_submission(
    db: Session, user: User, assessment_id: uuid.UUID, submission_id: uuid.UUID
) -> Submission:
    assessment = evidence_assessment(db, user, assessment_id)
    db.execute(select(Assessment.id).where(Assessment.id == assessment_id).with_for_update())
    row = db.scalar(
        select(Submission)
        .where(Submission.id == submission_id, Submission.assessment_id == assessment_id)
        .with_for_update()
    )
    if row is None or row.homeowner_id != user.id:
        raise HTTPException(404, "Submission not found.")
    if row.status != "pending_review":
        raise HTTPException(409, "Only submissions awaiting review can be edited.")
    if latest_submission_id(db, assessment_id) != row.id:
        raise HTTPException(409, "A newer submission exists. Open the latest evidence instead.")
    require_uploadable(db, assessment)
    return row


def update_submission(
    db: Session,
    store: PhotoStore,
    submission: Submission,
    user: User,
    photos: list[ValidatedPhoto],
    comment: str | None,
) -> SubmissionOut:
    """Replace photos only when supplied; keep the saved evidence if a write fails."""
    old_keys = [photo.storage_key for photo in submission.photos] if photos else []
    new_keys = []
    replacements = []
    try:
        for photo in photos:
            photo_id = uuid.uuid4()
            key = (
                f"homeowner/{submission.assessment_id}/{submission.id}/{photo_id}.{photo.extension}"
            )
            new_keys.append(key)
            store.save(key, photo.data, photo.content_type)
            replacements.append(
                SubmissionPhoto(
                    id=photo_id,
                    file_name=photo.file_name,
                    content_type=photo.content_type,
                    size_bytes=len(photo.data),
                    storage_key=key,
                )
            )
        if replacements:
            submission.photos = replacements
        submission.comment = comment
        submission.updated_at = datetime.now(UTC)
        submission.version += 1
        db.flush()
        result = submission_out(submission, user)
        db.commit()
    except Exception:
        try:
            db.rollback()
        finally:
            for key in new_keys:
                try:
                    store.delete(key)
                except OSError:
                    logger.exception("Could not clean up failed evidence update %s", key)
        raise
    # Delete superseded files only after the new database state is committed.
    for key in old_keys:
        try:
            store.delete(key)
        except OSError:
            logger.exception("Could not remove superseded homeowner photo %s", key)
    return result


def create_submission(
    db: Session,
    store: PhotoStore,
    assessment: Assessment,
    user: User,
    photos: list[ValidatedPhoto],
    comment: str | None,
) -> SubmissionOut:
    # Serialize creation and decisions for the same inspection point.
    db.execute(select(Assessment.id).where(Assessment.id == assessment.id).with_for_update())
    require_uploadable(db, assessment)
    latest_id = latest_submission_id(db, assessment.id)
    latest = db.get(Submission, latest_id) if latest_id else None
    if latest and latest.status in ("approved", "pending_review"):
        raise HTTPException(
            409, "This issue is approved or already awaiting review. Edit pending evidence instead."
        )
    submission = Submission(
        id=uuid.uuid4(),
        assessment_id=assessment.id,
        homeowner_id=user.id,
        comment=comment,
        status="pending_review",
        created_at=datetime.now(UTC),
        photos=[],
    )
    keys = []
    try:
        for photo in photos:
            photo_id = uuid.uuid4()
            key = f"homeowner/{assessment.id}/{submission.id}/{photo_id}.{photo.extension}"
            keys.append(key)
            store.save(key, photo.data, photo.content_type)
            submission.photos.append(
                SubmissionPhoto(
                    id=photo_id,
                    file_name=photo.file_name,
                    content_type=photo.content_type,
                    size_bytes=len(photo.data),
                    storage_key=key,
                )
            )
        db.add(submission)
        db.flush()
        # Materialize the response before commit so response validation cannot orphan files.
        result = submission_out(submission, user)
        db.commit()
    except Exception:
        try:
            db.rollback()
        finally:
            for key in keys:
                try:
                    store.delete(key)
                except OSError:
                    logger.exception("Could not clean up failed homeowner upload %s", key)
        raise
    return result
