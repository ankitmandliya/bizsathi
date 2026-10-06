from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    key: str
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ModuleCreate(BaseModel):
    key: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    description: str | None = None
    is_active: bool = True


class PlanEntitlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plan_id: UUID
    module_id: UUID
    included: bool
    module: ModuleRead | None = None


class PlanEntitlementCreate(BaseModel):
    module_id: UUID
    included: bool = True


class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None = None
    price_monthly: float
    price_yearly: float
    user_limit: int | None = None
    trial_days: int = 14
    is_active: bool = True
    is_public: bool = True
    entitlements: list[PlanEntitlementRead] = []
    created_at: datetime
    updated_at: datetime


class PlanCreate(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: str | None = None
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    user_limit: int | None = None
    trial_days: int = 14
    is_active: bool = True
    is_public: bool = True
    module_ids: list[UUID] = []


class PlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price_monthly: float | None = None
    price_yearly: float | None = None
    user_limit: int | None = None
    trial_days: int | None = None
    is_active: bool | None = None
    is_public: bool | None = None
    module_ids: list[UUID] | None = None


class SubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    plan_id: UUID
    status: str
    billing_cycle: str
    trial_ends_at: datetime | None = None
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    pending_downgrade_plan_id: UUID | None = None
    plan: PlanRead | None = None
    included_modules: list[str] = []
    user_count: int = 1
    user_limit: int | None = None
    created_at: datetime
    updated_at: datetime


class SubscriptionOverrideRequest(BaseModel):
    tenant_id: UUID
    plan_id: UUID
    status: str = "ACTIVE"
    billing_cycle: str = "monthly"


class PlanChangeRequest(BaseModel):
    plan_id: UUID
    billing_cycle: str = "monthly"  # monthly | yearly
    coupon_code: str | None = None


class PlanChangeResponse(BaseModel):
    subscription: SubscriptionRead
    prorated_charge: float = 0.0
    is_downgrade: bool = False
    message: str


class CouponRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    discount_type: str
    discount_value: float
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    max_uses: int | None = None
    used_count: int = 0
    applicable_plan_ids: list[str] | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class CouponCreate(BaseModel):
    code: str = Field(..., max_length=50)
    discount_type: str = "PERCENTAGE"  # PERCENTAGE | FLAT
    discount_value: float = Field(..., gt=0)
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    max_uses: int | None = None
    applicable_plan_ids: list[str] | None = None
    is_active: bool = True


class CouponUpdate(BaseModel):
    discount_type: str | None = None
    discount_value: float | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    max_uses: int | None = None
    applicable_plan_ids: list[str] | None = None
    is_active: bool | None = None


class CouponValidateRequest(BaseModel):
    code: str
    plan_id: UUID


class CouponValidateResponse(BaseModel):
    valid: bool
    discount_type: str | None = None
    discount_value: float | None = None
    discount_amount: float = 0.0
    final_price: float = 0.0
    message: str


class CheckoutSessionCreate(BaseModel):
    plan_id: UUID
    billing_cycle: str = "monthly"
    coupon_code: str | None = None


class CheckoutSessionResponse(BaseModel):
    provider: str = "RAZORPAY"
    order_id: str
    amount: float
    currency: str = "INR"
    key_id: str
    plan_name: str
    billing_cycle: str


class BillingPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    subscription_id: UUID | None = None
    amount: float
    status: str
    provider: str
    provider_payment_id: str | None = None
    provider_order_id: str | None = None
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class BillingInvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    subscription_id: UUID | None = None
    payment_id: UUID | None = None
    invoice_number: str
    period_start: datetime | None = None
    period_end: datetime | None = None
    subtotal: float
    tax_amount: float
    tax_rate_percent: float
    total: float
    status: str
    pdf_url: str | None = None
    created_at: datetime
    updated_at: datetime


class AdminMetricsResponse(BaseModel):
    trial_count: int
    active_count: int
    past_due_count: int
    suspended_count: int
    expired_count: int
    total_businesses: int
    new_signups_this_month: int
    mrr: float
