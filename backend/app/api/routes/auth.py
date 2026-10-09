from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.schemas.auth import SignupRequest, UserOut
from app.services.user_service import EmailAlreadyRegisteredError, create_resident

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/signup",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_409_CONFLICT: {"description": "Email already registered"}},
)
def signup(payload: SignupRequest, db: DbSession) -> User:
    """Create a resident account."""
    try:
        return create_resident(db, payload)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists."
        ) from None
