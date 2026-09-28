from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.audit import PaginatedAuditLogsResponse
from app.services.audit import list_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get(
    "",
    response_model=PaginatedAuditLogsResponse,
    dependencies=[Depends(require_permission("audit.view"))],
)
async def get_audit_logs(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    entity_type: str | None = Query(None, description="Comma-separated entity types (e.g. lead,invoice)"),
    entity_id: str | None = Query(None, description="Comma-separated entity IDs"),
    user_id: UUID | None = Query(None, description="Filter by user ID"),
    action: str | None = Query(None, description="Comma-separated action names"),
    date_from: datetime | date | None = Query(None, description="Filter start date"),
    date_to: datetime | date | None = Query(None, description="Filter end date"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedAuditLogsResponse:
    return await list_audit_logs(
        db=db,
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
