from typing import Annotated, Literal

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]


class HealthResponse(BaseModel):
    status: Literal["ok"]


class DbHealthResponse(BaseModel):
    status: Literal["ok", "unavailable"]
    postgres: str | None = None
    postgis: str | None = None


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Report whether the API process is available."""
    return HealthResponse(status="ok")


@router.get("/health/db", response_model=DbHealthResponse)
def db_health_check(db: DbSession):
    """Check the database connection and that PostGIS is installed."""
    try:
        pg_ver = db.execute(text("SHOW server_version")).scalar_one()
        gis_ver = db.execute(text("SELECT postgis_lib_version()")).scalar_one()
    except SQLAlchemyError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=DbHealthResponse(status="unavailable").model_dump(),
        )
    return DbHealthResponse(status="ok", postgres=pg_ver, postgis=gis_ver)
