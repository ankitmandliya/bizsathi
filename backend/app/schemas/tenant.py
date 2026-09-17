from uuid import UUID
from pydantic import BaseModel


class TenantBase(BaseModel):
    name: str
    slug: str
    domain: str | None = None
    is_active: bool = True


class TenantCreate(TenantBase):
    pass


class TenantResponse(TenantBase):
    id: UUID

    class Config:
        from_attributes = True
