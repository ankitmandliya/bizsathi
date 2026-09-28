from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# --- Template Schemas ---
class TemplateBase(BaseModel):
    name: str = Field(..., max_length=255)
    category: str = Field("Offer", description="Invoice, Sales, Stock, Offer")
    whatsapp_body: str | None = None
    email_subject: str | None = None
    email_body: str | None = None


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    whatsapp_body: str | None = None
    email_subject: str | None = None
    email_body: str | None = None


class TemplateResponse(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    whatsapp_status: str | None = None  # DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
    whatsapp_provider_template_id: str | None = None
    created_at: datetime
    updated_at: datetime


# --- Audience Schemas ---
class AudienceCountRequest(BaseModel):
    audience_filter: str = Field("ALL", description="ALL, CITY, CUSTOMER_TYPE")
    audience_filter_value: str | None = None


class AudienceCountResponse(BaseModel):
    total_customers: int
    whatsapp_eligible: int
    email_eligible: int
    distinct_cities: list[str]
    customer_types: list[str]


# --- Campaign Schemas ---
class CampaignCreate(BaseModel):
    name: str = Field(..., max_length=255)
    template_id: UUID
    audience_filter: str = Field("ALL", description="ALL, CITY, CUSTOMER_TYPE")
    audience_filter_value: str | None = None
    scheduled_at: datetime | None = None


class CampaignRecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_id: UUID
    customer_id: UUID
    customer_name: str | None = None
    channel: str
    status: str
    error_reason: str | None = None
    sent_at: datetime | None = None


class CampaignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    template_id: UUID
    template_name: str | None = None
    name: str
    audience_filter: str
    audience_filter_value: str | None = None
    status: str  # DRAFT, SCHEDULED, SENDING, SENT, FAILED_PARTIAL
    scheduled_at: datetime | None = None
    created_by_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class CampaignDetailResponse(CampaignResponse):
    total_recipients: int = 0
    sent_count: int = 0
    delivered_count: int = 0
    failed_count: int = 0
    actual_channels_used: list[str] = []
    recipients: list[CampaignRecipientResponse] = []
