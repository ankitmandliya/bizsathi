from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_current_tenant, get_current_user
from app.models.domain import User

router = APIRouter(prefix="/hrm", tags=["hrm"])


@router.get("/status")
async def get_hrm_status(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> dict[str, str]:
    return {
        "module": "hrm",
        "status": "foundation_ready",
        "tenant_id": str(tenant_id),
    }
