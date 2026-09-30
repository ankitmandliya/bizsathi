from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class PresetFilterEnum(str, Enum):
    TODAY = "today"
    THIS_WEEK = "this_week"
    CURRENT_MONTH = "current_month"
    LAST_MONTH = "last_month"
    QUARTER_TO_DATE = "quarter_to_date"
    YEAR_TO_DATE = "year_to_date"
    CUSTOM = "custom"


class ReportCategoryEnum(str, Enum):
    SALES = "sales"
    EXPENSES = "expenses"
    CUSTOMERS = "customers"
    VENDORS = "vendors"
    INVENTORY = "inventory"
    HRM = "hrm"
    CRM = "crm"
    CAMPAIGNS = "campaigns"


class SummaryCardItem(BaseModel):
    title: str
    value: str
    trend: Optional[str] = None
    trend_is_positive: Optional[bool] = True
    subtitle: Optional[str] = None
    icon: Optional[str] = None


class ChartDataPoint(BaseModel):
    label: str
    value: float


class ChartSeriesItem(BaseModel):
    name: Optional[str] = "Metric"
    label: Optional[str] = None
    value: Optional[float] = None
    secondary_value: Optional[float] = None
    data: list[ChartDataPoint] = Field(default_factory=list)
    color: Optional[str] = None


class ChartDataResponse(BaseModel):
    chart_type: str = "bar"
    title: str
    labels: list[str] = Field(default_factory=list)
    series: list[ChartSeriesItem] = Field(default_factory=list)


class ReportPaginationMeta(BaseModel):
    page: int = 1
    page_size: int = 20
    total_items: int = 0
    total_pages: int = 1


class ReportTableRow(BaseModel):
    id: str
    columns: dict[str, Any]
    status_badge: Optional[str] = None
    raw_id: Optional[str] = None


class PaginatedReportTable(BaseModel):
    items: list[ReportTableRow] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 1


class DashboardMetricsResponse(BaseModel):
    active_tenants: int
    active_tenants_trend: str
    total_revenue: float
    revenue_trend: str
    open_tasks: int
    tasks_trend: str
    system_health: str
    system_health_status: str
    active_leads: int
    open_deals: int
    subscriptions: int
    performance_trend: list[Any] = Field(default_factory=list)
    recent_activities: list[Any] = Field(default_factory=list)


class PerformanceTrendItem(BaseModel):
    day: str
    date: str
    revenue: float
    height: int


class ActivityItem(BaseModel):
    id: str
    text: str
    time: str
    color: str
    category: str


# Report specific API response contracts
class BaseReportResponse(BaseModel):
    summary: list[SummaryCardItem] = Field(default_factory=list)
    table: PaginatedReportTable = Field(default_factory=PaginatedReportTable)
    summary_cards: list[SummaryCardItem] = Field(default_factory=list)
    charts: list[ChartDataResponse] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    pagination: ReportPaginationMeta = Field(default_factory=ReportPaginationMeta)
    category: str = "General"
    from_date: str = ""
    to_date: str = ""


class SalesReportResponse(BaseReportResponse):
    trend: ChartSeriesItem
    status_breakdown: ChartSeriesItem


class ExpensesReportResponse(BaseReportResponse):
    trend: ChartSeriesItem
    category_breakdown: ChartSeriesItem


class CustomersReportResponse(BaseReportResponse):
    top_customers_chart: ChartSeriesItem


class VendorsReportResponse(BaseReportResponse):
    top_vendors_chart: ChartSeriesItem


class InventoryReportResponse(BaseReportResponse):
    category_value_chart: ChartSeriesItem
    stock_status_chart: ChartSeriesItem


class HRMReportResponse(BaseReportResponse):
    payroll_trend_chart: ChartSeriesItem
    leave_status_chart: ChartSeriesItem


class CRMReportResponse(BaseReportResponse):
    lead_source_chart: ChartSeriesItem
    deal_pipeline_chart: ChartSeriesItem


class CampaignsReportResponse(BaseReportResponse):
    roi_by_campaign_chart: ChartSeriesItem
    status_breakdown_chart: ChartSeriesItem


# Internal Row models for typed table serialization
class SalesReportRow(BaseModel):
    invoice_date: str
    invoice_number: str
    customer_name: str
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    amount_due: Decimal


class ExpenseReportRow(BaseModel):
    expense_date: str
    title: str
    category_name: str
    payment_method: str
    vendor_name: Optional[str] = None
    reference_number: Optional[str] = None
    amount: Decimal


class CustomerReportRow(BaseModel):
    created_at: str
    name: str
    company: Optional[str] = None
    phone: str
    email: Optional[str] = None
    customer_type: str
    city: Optional[str] = None
    opening_balance: Decimal
    outstanding_balance: Decimal


class VendorReportRow(BaseModel):
    created_at: str
    name: str
    company_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    vendor_type: str
    payment_terms: Optional[str] = None
    opening_balance: Decimal
    opening_balance_type: str
    outstanding_display: str


class InventoryReportRow(BaseModel):
    sku: str
    product_name: str
    category_name: str
    unit_name: str
    purchase_price: Decimal
    selling_price: Decimal
    current_stock: Decimal
    minimum_stock: Decimal
    stock_status: str
    stock_value: Decimal


class HrmReportRow(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    designation: str
    employment_type: str
    joining_date: str
    status: str
    days_present: int
    days_absent: int
    days_leave: int


class CrmReportRow(BaseModel):
    date: str
    type: str
    name_or_title: str
    contact_or_customer: str
    stage_or_status: str
    value: float
    source_or_owner: str


class CampaignReportRow(BaseModel):
    created_at: str
    name: str
    template_name: str
    audience_filter: str
    status: str
    total_recipients: int
    sent_count: int
    delivered_count: int
    failed_count: int
