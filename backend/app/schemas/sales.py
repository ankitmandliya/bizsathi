from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LineItemCreate(BaseModel):
    description: str = Field(..., min_length=1)
    quantity: float = Field(default=1.0, ge=0.01)
    rate: float = Field(default=0.0, ge=0.0)
    tax_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)


class LineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    quantity: float
    rate: float
    tax_rate_percent: float
    amount: float
    tax_amount: float
    total: float


class QuotationCreate(BaseModel):
    customer_id: UUID
    issue_date: datetime
    valid_until: datetime | None = None
    notes: str | None = None
    items: list[LineItemCreate] = Field(..., min_length=1)


class QuotationUpdate(BaseModel):
    customer_id: UUID | None = None
    status: str | None = None
    issue_date: datetime | None = None
    valid_until: datetime | None = None
    notes: str | None = None
    items: list[LineItemCreate] | None = None


class QuotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    customer_id: UUID
    quotation_number: str
    status: str
    issue_date: datetime
    valid_until: datetime | None = None
    subtotal: float
    tax_amount: float
    total_amount: float
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[LineItemResponse] = []


class InvoiceCreate(BaseModel):
    customer_id: UUID
    quotation_id: UUID | None = None
    issue_date: datetime
    due_date: datetime
    notes: str | None = None
    items: list[LineItemCreate] = Field(..., min_length=1)


class InvoiceUpdate(BaseModel):
    customer_id: UUID | None = None
    status: str | None = None
    issue_date: datetime | None = None
    due_date: datetime | None = None
    notes: str | None = None
    items: list[LineItemCreate] | None = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    customer_id: UUID
    quotation_id: UUID | None = None
    invoice_number: str
    status: str
    issue_date: datetime
    due_date: datetime
    subtotal: float
    tax_amount: float
    total_amount: float
    amount_paid: float
    amount_due: float
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[LineItemResponse] = []


class PaymentCreate(BaseModel):
    invoice_id: UUID
    amount: float = Field(..., gt=0.0)
    payment_date: datetime
    payment_mode: Literal["Cash", "Bank Transfer", "UPI", "Cheque", "Other"] = "UPI"
    notes: str | None = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    invoice_id: UUID
    customer_id: UUID
    amount: float
    payment_date: datetime
    payment_mode: str
    receipt_number: str
    notes: str | None = None
    created_at: datetime


class PaginatedQuotationsResponse(BaseModel):
    items: list[QuotationResponse]
    total: int
    page: int
    limit: int


class PaginatedInvoicesResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    limit: int


class CustomerStatementResponse(BaseModel):
    customer_id: UUID
    customer_name: str
    total_invoiced: float
    total_paid: float
    outstanding_balance: float
    invoices: list[InvoiceResponse]
    payments: list[PaymentResponse]
