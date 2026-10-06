from datetime import datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class BusinessListItem(BaseModel):
    id: UUID
    name: str
    slug: str
    status: str
    created_via: str
    created_at: datetime
    member_count: int = 1
    owner_name: str | None = None
    owner_email: str | None = None
    setup_pending: bool = False
    suspended_at: datetime | None = None
    suspended_reason: str | None = None
    current_plan_name: str | None = None
    subscription_status: str | None = None
    invitation_email_status: str = "PENDING"
    last_invitation_sent_at: datetime | None = None

    class Config:
        from_attributes = True


class PaginatedBusinessesResponse(BaseModel):
    items: list[BusinessListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class BusinessDetail(BaseModel):
    id: UUID
    name: str
    slug: str
    domain: str | None = None
    is_active: bool
    status: str
    created_via: str
    created_at: datetime
    suspended_at: datetime | None = None
    suspended_reason: str | None = None
    member_count: int = 1
    owner: dict[str, Any] = Field(default_factory=dict)
    setup_pending: bool = False
    current_plan_name: str | None = None
    subscription_status: str | None = None
    invitation_email_status: str = "PENDING"
    last_invitation_sent_at: datetime | None = None

    class Config:
        from_attributes = True


class CreateProvisionedBusinessRequest(BaseModel):
    name: str = Field(..., min_length=2)
    owner_name: str = Field(..., min_length=2)
    owner_email: EmailStr


class SuspendBusinessRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class AdminDashboardStats(BaseModel):
    total_businesses: int
    active_businesses: int
    suspended_businesses: int
    new_this_week: int
    new_this_month: int
    setup_pending_count: int
    trial_count: int = 0
    active_count: int = 0
    past_due_count: int = 0
    grace_period_count: int = 0
    suspended_count: int = 0
    expired_count: int = 0
    mrr: float = 0.0


class EmailSettingsResponse(BaseModel):
    configured: bool = False
    provider: str = "SMTP"
    host: str = "Not Configured"
    port: int = 587
    security: str = "STARTTLS"
    username: str = "None"
    from_email: str = "no-reply@bizsathi.com"
    from_name: str = "BizSathi"
    connection_status: str = "not_configured"
    last_test_at: datetime | None = None
    last_test_status: str | None = None
    last_test_recipient: str | None = None


class SendTestEmailRequest(BaseModel):
    recipient_email: EmailStr


class PlatformSettingsResponse(BaseModel):
    maintenance_mode: bool = False
    public_signup_enabled: bool = True
    default_rate_limit: int = 5
    app_env: str = "development"
    updated_at: datetime | None = None
    email_settings: EmailSettingsResponse | None = None


class PlatformSettingsUpdate(BaseModel):
    maintenance_mode: bool | None = None
    public_signup_enabled: bool | None = None
    default_rate_limit: int | None = None


class ManualVerifySetupRequest(BaseModel):
    password: str | None = Field(default=None, min_length=6)

