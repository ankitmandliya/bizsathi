from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ExpenseCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    @field_validator("name")

    def name_must_not_be_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Category name cannot be empty")
        return trimmed


class ExpenseCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("name")

    def name_must_not_be_empty_if_provided(cls, v: str | None) -> str | None:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Category name cannot be empty")
            return trimmed
        return v


class ExpenseCategoryResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


PaymentMethodEnum = Literal["CASH", "BANK", "UPI", "CARD", "OTHER"]


class ExpenseCreate(BaseModel):
    category_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    amount: Decimal
    expense_date: date
    payment_method: PaymentMethodEnum = "CASH"
    vendor_name: str | None = None
    reference_number: str | None = None
    receipt_url: str | None = None

    @field_validator("title")

    def title_must_not_be_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Expense title cannot be empty")
        return trimmed

    @field_validator("amount")

    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Expense amount must be greater than 0")
        return v


class ExpenseUpdate(BaseModel):
    category_id: UUID | None = None
    title: str | None = None
    description: str | None = None
    amount: Decimal | None = None
    expense_date: date | None = None
    payment_method: PaymentMethodEnum | None = None
    vendor_name: str | None = None
    reference_number: str | None = None
    receipt_url: str | None = None

    @field_validator("title")

    def title_must_not_be_empty_if_provided(cls, v: str | None) -> str | None:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Expense title cannot be empty")
            return trimmed
        return v

    @field_validator("amount")

    def amount_must_be_positive_if_provided(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("Expense amount must be greater than 0")
        return v


class ExpenseResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    category_id: UUID
    category_name: str = ""
    title: str
    description: str | None = None
    amount: float
    expense_date: date
    payment_method: str
    vendor_name: str | None = None
    reference_number: str | None = None
    receipt_url: str | None = None
    created_by_id: UUID | None = None
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedExpensesResponse(BaseModel):
    items: list[ExpenseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryBreakdownItem(BaseModel):
    category_id: UUID
    category_name: str
    amount: float
    percentage: float
    count: int = 0


class ExpenseSummaryResponse(BaseModel):
    total_expense: float
    expense_count: int
    category_breakdown: list[CategoryBreakdownItem]
