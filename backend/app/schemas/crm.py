from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PipelineStageResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    order: int
    probability: int
    is_won: bool
    is_lost: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadBase(BaseModel):
    name: str = Field(..., min_length=1)
    company: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    whatsapp: str | None = None
    job_title: str | None = None
    website: str | None = None

    source: str = "Website"
    status: str = "New"  # New, Contacted, Qualified, Converted, Lost
    priority: str = "Medium"  # Low, Medium, High
    industry: str | None = None
    estimated_value: int = 0

    assigned_user_id: UUID | None = None
    follow_up_date: datetime | None = None
    notes: str | None = None
    lost_reason: str | None = None

    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    whatsapp: str | None = None
    job_title: str | None = None
    website: str | None = None

    source: str | None = None
    status: str | None = None
    priority: str | None = None
    industry: str | None = None
    estimated_value: int | None = None

    assigned_user_id: UUID | None = None
    follow_up_date: datetime | None = None
    notes: str | None = None
    lost_reason: str | None = None

    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None


class LeadResponse(LeadBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    converted_at: datetime | None = None
    converted_customer_id: UUID | None = None
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    email: str | None = None
    customer_type: str = "Individual"
    company: str | None = None
    billing_address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gstin: str | None = None
    pan: str | None = None
    opening_balance: float = 0.0
    opening_balance_type: str = "Debit"
    credit_limit: float | None = None
    notes: str | None = None
    whatsapp: str | None = None
    assigned_user_id: UUID | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    customer_type: str | None = None
    company: str | None = None
    billing_address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gstin: str | None = None
    pan: str | None = None
    opening_balance: float | None = None
    opening_balance_type: str | None = None
    credit_limit: float | None = None
    notes: str | None = None
    whatsapp: str | None = None
    assigned_user_id: UUID | None = None


class CustomerResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    customer_type: str = "Individual"
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gstin: str | None = None
    pan: str | None = None
    billing_address: str | None = None
    opening_balance: float = 0.0
    opening_balance_type: str = "Debit"
    credit_limit: float | None = None
    notes: str | None = None
    converted_from_lead_id: UUID | None = None
    assigned_user_id: UUID | None = None
    outstanding_balance: float = 0.0
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedCustomersResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    limit: int


class CustomerImportRowError(BaseModel):
    row: int
    reason: str


class CustomerImportSummary(BaseModel):
    imported_count: int
    skipped_count: int
    failed_count: int
    errors: list[CustomerImportRowError] = []


class DealBase(BaseModel):
    title: str = Field(..., min_length=1)
    value: int = 0
    currency: str = "USD"
    stage_id: UUID
    lead_id: UUID | None = None
    customer_id: UUID | None = None
    probability: int = 0
    expected_closing_date: datetime | None = None
    actual_closing_date: datetime | None = None
    owner_id: UUID | None = None
    won_reason: str | None = None
    lost_reason: str | None = None
    notes: str | None = None


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    title: str | None = None
    value: int | None = None
    currency: str | None = None
    stage_id: UUID | None = None
    lead_id: UUID | None = None
    customer_id: UUID | None = None
    probability: int | None = None
    expected_closing_date: datetime | None = None
    actual_closing_date: datetime | None = None
    owner_id: UUID | None = None
    won_reason: str | None = None
    lost_reason: str | None = None
    notes: str | None = None


class DealResponse(DealBase):
    id: UUID
    tenant_id: UUID
    stage: PipelineStageResponse | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ActivityBase(BaseModel):
    type: str = "Note"  # Call, Meeting, Email, WhatsApp, Note, Task
    subject: str = Field(..., min_length=1)
    description: str | None = None
    due_date: datetime | None = None
    completed_at: datetime | None = None
    status: str = "pending"  # pending, completed
    priority: str = "Medium"
    assigned_user_id: UUID | None = None

    lead_id: UUID | None = None
    deal_id: UUID | None = None
    customer_id: UUID | None = None


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    type: str | None = None
    subject: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    completed_at: datetime | None = None
    status: str | None = None
    priority: str | None = None
    assigned_user_id: UUID | None = None


class ActivityResponse(ActivityBase):
    id: UUID
    tenant_id: UUID
    created_by_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedLeadsResponse(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    limit: int


class PaginatedDealsResponse(BaseModel):
    items: list[DealResponse]
    total: int
    page: int
    limit: int
