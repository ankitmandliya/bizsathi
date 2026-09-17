import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.routes import router as api_v1_router
from app.api.v1.health.routes import ready as readiness_check
from app.core.config import get_settings
from app.core.cors import configure_cors

logger = logging.getLogger(__name__)

settings = get_settings()
app = FastAPI(title="BizSathi", version="0.1.0", debug=settings.debug)

configure_cors(app)
app.include_router(api_v1_router)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error("Database connection error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database connection error. Please ensure PostgreSQL database service is running."
        },
    )


@app.exception_handler(OSError)
async def os_error_exception_handler(request: Request, exc: OSError) -> JSONResponse:
    logger.error("Network / OS database connection refused: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database network connection refused. Please ensure PostgreSQL service is running on port 5432."
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> JSONResponse:
    return await readiness_check()

