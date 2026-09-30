from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VendorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    contact_person: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    vendor_type: Literal["Individual", "Business"] = "Business"
    company_name: str | None = Field(None, max_length=255)
    billing_address: str | None = None
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    pincode: str | None = Field(None, max_length=20)
    gstin: str | None = Field(None, max_length=50)
    pan: str | None = Field(None, max_length=50)
    payment_terms: str | None = Field(None, max_length=255)
    opening_balance: Decimal = Field(default=Decimal("0.00"), ge=0)
    opening_balance_type: Literal["Payable", "Advance"] = "Payable"
    notes: str | None = None

    @field_validator("name", "phone")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    contact_person: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    vendor_type: Literal["Individual", "Business"] | None = None
    company_name: str | None = Field(None, max_length=255)
    billing_address: str | None = None
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    pincode: str | None = Field(None, max_length=20)
    gstin: str | None = Field(None, max_length=50)
    pan: str | None = Field(None, max_length=50)
    payment_terms: str | None = Field(None, max_length=255)
    opening_balance: Decimal | None = Field(None, ge=0)
    opening_balance_type: Literal["Payable", "Advance"] | None = None
    notes: str | None = None

    @field_validator("name", "phone")
    @classmethod
    def validate_not_empty_optional(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Field cannot be empty if provided")
        return v.strip() if v is not None else None


class VendorResponse(VendorBase):
    id: UUID
    tenant_id: UUID
    outstanding_payable: Decimal = Decimal("0.00")
    outstanding_display: str = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedVendorsResponse(BaseModel):
    items: list[VendorResponse]
    total: int
    page: int
    limit: int


class VendorImportSummaryResponse(BaseModel):
    total_rows: int
    imported: int
    skipped_duplicates: int
    failed: int
    errors: list[dict]
