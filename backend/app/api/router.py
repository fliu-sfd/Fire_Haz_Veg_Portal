from fastapi import APIRouter

from app.api.routes import (
    admin,
    admin_hazards,
    admin_settings,
    admin_submissions,
    assessment_requests,
    assessments,
    auth,
    health,
    me,
    residents,
    submissions,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(residents.router)
api_router.include_router(admin_hazards.router)
api_router.include_router(admin_settings.router)
api_router.include_router(admin_submissions.router)
api_router.include_router(assessment_requests.router)
api_router.include_router(me.router)
api_router.include_router(assessments.router)
api_router.include_router(submissions.router)
