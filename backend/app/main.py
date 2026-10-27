import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


def _configure_logging() -> None:
    """Send INFO lines from app.* loggers (such as admin edits) to stderr next to uvicorn's."""
    logger = logging.getLogger("app")
    if logger.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s:     %(name)s: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    _configure_logging()
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
    )
    # credentials so the browser sends the auth cookie from the frontend origin
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    application.include_router(api_router, prefix=settings.api_v1_prefix)

    @application.get("/", tags=["meta"])
    async def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "version": settings.app_version,
        }

    return application


app = create_app()
