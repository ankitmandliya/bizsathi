from datetime import datetime, UTC
import logging
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.redis import redis_client

logger = logging.getLogger(__name__)

# In-memory rate limiting state fallback (key -> list of timestamp floats)
_IN_MEMORY_RATE_LIMITS: dict[str, list[float]] = defaultdict(list)


async def check_rate_limit(
    request: Request,
    key_prefix: str = "rate_limit",
    max_requests: int = 5,
    window_seconds: int = 3600,
) -> None:
    """Rate limit checker dependency.
    Uses Redis sliding window / counter if available; falls back to in-memory sliding window.
    """
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "127.0.0.1")
    )
    redis_key = f"{key_prefix}:{client_ip}"
    now = datetime.now(UTC).timestamp()

    # Try Redis first
    try:
        pipeline = redis_client.pipeline()
        pipeline.zremrangebyscore(redis_key, 0, now - window_seconds)
        pipeline.zadd(redis_key, {str(now): now})
        pipeline.zcard(redis_key)
        pipeline.expire(redis_key, window_seconds)
        results = await pipeline.execute()
        request_count = results[2]

        if request_count > max_requests:
            logger.warning("Rate limit exceeded for IP %s on key %s", client_ip, redis_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
            )
        return
    except HTTPException:
        raise
    except Exception as exc:
        logger.debug("Redis rate limiter unavailable (%s), falling back to in-memory store", exc)

    # In-memory fallback
    mem_key = f"{key_prefix}:{client_ip}"
    timestamps = _IN_MEMORY_RATE_LIMITS[mem_key]
    # Remove timestamps older than window
    cutoff = now - window_seconds
    _IN_MEMORY_RATE_LIMITS[mem_key] = [ts for ts in timestamps if ts > cutoff]
    
    if len(_IN_MEMORY_RATE_LIMITS[mem_key]) >= max_requests:
        logger.warning("In-memory rate limit exceeded for IP %s on key %s", client_ip, mem_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )
    
    _IN_MEMORY_RATE_LIMITS[mem_key].append(now)


def clear_rate_limits() -> None:
    """Helper to clear rate limit state during tests."""
    _IN_MEMORY_RATE_LIMITS.clear()
