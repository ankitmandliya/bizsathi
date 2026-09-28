from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: UUID
    created_at: datetime
    actor_name: str | None = None
    user_id: UUID | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    entity_label: str | None = None
    changes: dict[str, Any] | None = None
    details: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None

    class Config:
        from_attributes = True


class PaginatedAuditLogsResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
