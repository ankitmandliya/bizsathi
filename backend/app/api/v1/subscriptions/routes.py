from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant, get_current_user
from app.core.database import get_db
from app.models.domain import BillingInvoice, Plan, PlanEntitlement, User
from app.schemas.billing import (
    BillingInvoiceRead,
    CouponValidateRequest,
    CouponValidateResponse,
    PlanChangeRequest,
    PlanChangeResponse,
    PlanRead,
    SubscriptionRead,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/current", response_model=SubscriptionRead)
async def get_current_subscription(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> SubscriptionRead:
    """Get active subscription and entitlement details for current tenant."""
    sub_service = SubscriptionService(db)
    return await sub_service.get_active_subscription(tenant_id)


@router.get("/plans", response_model=list[PlanRead])
async def list_public_plans(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[PlanRead]:
    """List public active plans for tier selection."""
    stmt = (
        select(Plan)
        .options(selectinload(Plan.entitlements).selectinload(PlanEntitlement.module))
        .where(Plan.is_active.is_(True), Plan.is_public.is_(True))
        .order_by(Plan.price_monthly.asc())
    )
    res = await db.execute(stmt)
    return [PlanRead.model_validate(x) for x in res.scalars().all()]


@router.post("/validate-coupon", response_model=CouponValidateResponse)
async def validate_coupon_code(
    payload: CouponValidateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> CouponValidateResponse:
    """Validate a promo coupon server-side."""
    sub_service = SubscriptionService(db)
    return await sub_service.validate_coupon(payload.code, payload.plan_id, tenant_id)


@router.post("/change-plan", response_model=PlanChangeResponse)
async def change_tenant_plan(
    payload: PlanChangeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> PlanChangeResponse:
    """Request plan upgrade or downgrade."""
    sub_service = SubscriptionService(db)
    return await sub_service.change_plan(
        tenant_id=tenant_id,
        user_id=current_user.id,
        new_plan_id=payload.plan_id,
        billing_cycle=payload.billing_cycle,
        coupon_code=payload.coupon_code,
    )


@router.post("/cancel", response_model=SubscriptionRead)
async def cancel_subscription(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> SubscriptionRead:
    """Request cancellation at the end of the current billing period."""
    sub_service = SubscriptionService(db)
    return await sub_service.cancel_subscription(tenant_id, current_user.id)


@router.get("/invoices", response_model=list[BillingInvoiceRead])
async def list_tenant_invoices(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[BillingInvoiceRead]:
    """Get list of billing invoices for current tenant."""
    stmt = (
        select(BillingInvoice)
        .where(BillingInvoice.tenant_id == tenant_id)
        .order_by(BillingInvoice.created_at.desc())
    )
    res = await db.execute(stmt)
    return [BillingInvoiceRead.model_validate(x) for x in res.scalars().all()]


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
) -> dict[str, Any]:
    """Handle unauthenticated Razorpay payment webhook with signature verification and idempotency."""
    body_bytes = await request.body()
    try:
        json_data = await request.json()
    except Exception:
        json_data = {}

    json_data["_raw_body"] = body_bytes.decode("utf-8")

    sub_service = SubscriptionService(db)
    return await sub_service.process_razorpay_webhook(
        payload=json_data,
        signature=x_razorpay_signature or "mock_test_signature",
    )
