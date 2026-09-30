from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# --- Product Categories ---

class ProductCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    is_active: bool = True


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None


class ProductCategoryResponse(ProductCategoryBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Units ---

class UnitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str | None = Field(None, max_length=20)
    is_active: bool = True


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    short_name: str | None = Field(None, max_length=20)
    is_active: bool | None = None


class UnitResponse(UnitBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Products ---

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    category_id: UUID | None = None
    unit_id: UUID
    description: str | None = None
    purchase_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    selling_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    minimum_stock: Decimal = Field(default=Decimal("0.00"), ge=0)
    is_active: bool = True


class ProductCreate(ProductBase):
    opening_stock: Decimal | None = Field(default=None, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    sku: str | None = Field(None, min_length=1, max_length=100)
    category_id: UUID | None = None
    unit_id: UUID | None = None
    description: str | None = None
    purchase_price: Decimal | None = Field(None, ge=0)
    selling_price: Decimal | None = Field(None, ge=0)
    minimum_stock: Decimal | None = Field(None, ge=0)
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: UUID
    tenant_id: UUID
    current_stock: Decimal = Decimal("0.00")
    stock_status: Literal["Normal", "Low Stock", "Out of Stock"] = "Normal"
    category_name: str | None = None
    unit_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedProductsResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    limit: int


# --- Stock Movements ---

class OpeningStockCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(..., ge=0)
    notes: str | None = None


class StockInCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(..., gt=0)
    unit_cost: Decimal | None = Field(None, ge=0)
    movement_date: datetime | None = None
    reason: str = Field(default="Purchase", max_length=255)
    reference_number: str | None = Field(None, max_length=255)
    notes: str | None = None
    vendor_id: UUID | None = None


class StockOutCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(..., gt=0)
    movement_date: datetime | None = None
    reason: str = Field(default="Sale", max_length=255)
    reference_number: str | None = Field(None, max_length=255)
    notes: str | None = None


class StockAdjustmentCreate(BaseModel):
    product_id: UUID
    physical_count: Decimal = Field(..., ge=0)
    reason: str = Field(default="Physical Count Adjustment", max_length=255)
    notes: str | None = None


class StockMovementResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    product_id: UUID
    product_name: str | None = None
    product_sku: str | None = None
    unit_name: str | None = None
    vendor_id: UUID | None = None
    vendor_name: str | None = None
    movement_type: str  # OPENING, IN, OUT, ADJUSTMENT
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    reference_type: str | None = None
    reference_id: str | None = None
    movement_date: datetime
    reason: str | None = None
    notes: str | None = None
    created_by_id: UUID | None = None
    created_by_name: str | None = None
    running_balance: Decimal | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedStockMovementsResponse(BaseModel):
    items: list[StockMovementResponse]
    total: int
    page: int
    limit: int


# --- Dashboard & Reports ---

class InventoryDashboardResponse(BaseModel):
    total_products: int
    total_stock_quantity: Decimal
    total_stock_value: Decimal = Decimal("0.00")
    low_stock_count: int
    out_of_stock_count: int
    stock_in_this_month: Decimal = Decimal("0.00")
    stock_out_this_month: Decimal = Decimal("0.00")
    low_stock_products: list[ProductResponse] = []
    recent_movements: list[StockMovementResponse] = []



class StockSummaryItem(BaseModel):
    product_id: UUID
    product_name: str
    sku: str
    category_name: str | None = None
    unit_name: str
    current_stock: Decimal
    minimum_stock: Decimal
    stock_status: Literal["Normal", "Low Stock", "Out of Stock"]
    purchase_price: Decimal
    selling_price: Decimal
    total_value: Decimal


class StockSummaryReportResponse(BaseModel):
    items: list[StockSummaryItem]
    total_products: int
    total_stock_value: Decimal


class LowStockReportItem(BaseModel):
    product_id: UUID
    product_name: str
    sku: str
    category_name: str | None = None
    unit_name: str
    current_stock: Decimal
    minimum_stock: Decimal
    difference: Decimal  # minimum_stock - current_stock
    stock_status: Literal["Low Stock", "Out of Stock"]


class LowStockReportResponse(BaseModel):
    items: list[LowStockReportItem]
    total_low_stock: int


class ProductImportRowError(BaseModel):
    row_number: int
    product_name: str | None = None
    sku: str | None = None
    reason: str


class ProductImportSummaryResponse(BaseModel):
    total_rows: int
    imported: int
    skipped_duplicates: int
    failed: int
    errors: list[ProductImportRowError] = []
