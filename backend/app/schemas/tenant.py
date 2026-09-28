from uuid import UUID
from pydantic import BaseModel


class TenantBase(BaseModel):
    name: str
    slug: str
    domain: str | None = None
    is_active: bool = True
    logo_url: str | None = None
    whatsapp_enabled: bool = False
    whatsapp_business_number: str | None = None
    whatsapp_api_key: str | None = None
    email_enabled: bool = False
    email_sender_name: str | None = None


class TenantCreate(TenantBase):
    pass


class TenantSettingsUpdate(BaseModel):
    logo_url: str | None = None
    whatsapp_enabled: bool = False
    whatsapp_business_number: str | None = None
    whatsapp_api_key: str | None = None
    email_enabled: bool = False
    email_sender_name: str | None = None


class TenantResponse(TenantBase):
    id: UUID

    class Config:
        from_attributes = True
