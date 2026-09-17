from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.redis import redis_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def check_database() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        return False
    return True


async def check_redis() -> bool:
    try:
        return bool(await redis_client.ping())
    except Exception:
        return False


@router.get("/ready")
async def ready() -> JSONResponse:
    checks: dict[str, bool] = {
        "database": await check_database(),
        "redis": await check_redis(),
    }
    is_ready = all(checks.values())
    payload: dict[str, Any] = {"status": "ready" if is_ready else "unavailable", "checks": checks}
    response_status = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=response_status, content=payload)
