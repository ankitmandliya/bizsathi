from datetime import UTC, datetime, timedelta
import logging
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_platform_admin
from app.core.config import get_settings
from app.core.database import get_db
from app.models.domain import (
    AuditLog,
    BillingInvoice,
    BillingPayment,
    Coupon,
    Module,
    Plan,
    PlanEntitlement,
    Subscription,
    Tenant,
    TenantMember,
    User,
)
from app.schemas.admin import (
    AdminDashboardStats,
    BusinessDetail,
    BusinessListItem,
    CreateProvisionedBusinessRequest,
    EmailSettingsResponse,
    ManualVerifySetupRequest,
    PaginatedBusinessesResponse,
    PlatformSettingsResponse,
    PlatformSettingsUpdate,
    SendTestEmailRequest,
    SuspendBusinessRequest,
)
from app.schemas.audit import AuditLogResponse, PaginatedAuditLogsResponse
from app.schemas.billing import (
    BillingInvoiceRead,
    BillingPaymentRead,
    CouponCreate,
    CouponRead,
    CouponUpdate,
    ModuleRead,
    PlanCreate,
    PlanRead,
    PlanUpdate,
    SubscriptionOverrideRequest,
    SubscriptionRead,
)
from app.services.audit import get_client_ip, get_user_agent, log_audit_event
from app.services.email import EmailService
from app.services.subscription_service import SubscriptionService
from app.services.tenant import (
    UNSET_PASSWORD_SENTINEL,
    create_tenant_and_owner,
    get_or_create_tenant_setup_link,
    get_tenant_invitation_status,
    manual_verify_tenant_setup,
    resend_business_invitation,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["super-admin"])

_PLATFORM_SETTINGS: dict[str, Any] = {
    "maintenance_mode": False,
    "public_signup_enabled": True,
    "default_rate_limit": 5,
    "updated_at": None,
}

_EMAIL_TEST_STATUS: dict[str, Any] = {
    "last_test_at": None,
    "last_test_status": None,
    "last_test_recipient": None,
}


async def _get_business_detail_dict(db: AsyncSession, tenant_id: UUID) -> BusinessDetail:
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    # Get owner user
    owner_stmt = (
        select(User)
        .join(TenantMember, TenantMember.user_id == User.id)
        .where(TenantMember.tenant_id == tenant_id, TenantMember.is_owner.is_(True))
    )
    owner_res = await db.execute(owner_stmt)
    owner = owner_res.scalar_one_or_none()

    # Get member count
    count_stmt = select(func.count(TenantMember.id)).where(TenantMember.tenant_id == tenant_id)
    count_res = await db.execute(count_stmt)
    member_count = count_res.scalar() or 1

    # Get subscription & plan name
    sub_stmt = (
        select(Subscription, Plan)
        .join(Plan, Plan.id == Subscription.plan_id)
        .where(Subscription.tenant_id == tenant_id)
        .order_by(Subscription.created_at.desc())
    )
    sub_res = await db.execute(sub_stmt)
    sub_row = sub_res.first()

    current_plan_name = sub_row[1].name if sub_row else "Growth"
    subscription_status = sub_row[0].status if sub_row else "ACTIVE"

    setup_pending = bool(owner and owner.password_hash == UNSET_PASSWORD_SENTINEL)

    owner_dict = {
        "id": str(owner.id) if owner else None,
        "full_name": owner.full_name if owner else None,
        "email": owner.email if owner else None,
        "is_active": owner.is_active if owner else False,
    }

    inv_status, last_sent_at = await get_tenant_invitation_status(db, tenant_id)

    return BusinessDetail(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        domain=tenant.domain,
        is_active=tenant.is_active,
        status=getattr(tenant, "status", "Active"),
        created_via=getattr(tenant, "created_via", "SELF_SIGNUP"),
        created_at=tenant.created_at,
        suspended_at=getattr(tenant, "suspended_at", None),
        suspended_reason=getattr(tenant, "suspended_reason", None),
        member_count=member_count,
        owner=owner_dict,
        setup_pending=setup_pending,
        current_plan_name=current_plan_name,
        subscription_status=subscription_status,
        invitation_email_status=inv_status,
        last_invitation_sent_at=last_sent_at,
    )


@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> AdminDashboardStats:
    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_res = await db.execute(select(func.count(Tenant.id)))
    total_businesses = total_res.scalar() or 0

    active_res = await db.execute(select(func.count(Tenant.id)).where(Tenant.status == "Active"))
    active_businesses = active_res.scalar() or 0

    suspended_res = await db.execute(select(func.count(Tenant.id)).where(Tenant.status == "Suspended"))
    suspended_businesses = suspended_res.scalar() or 0

    week_res = await db.execute(select(func.count(Tenant.id)).where(Tenant.created_at >= week_ago))
    new_this_week = week_res.scalar() or 0

    month_res = await db.execute(select(func.count(Tenant.id)).where(Tenant.created_at >= month_ago))
    new_this_month = month_res.scalar() or 0

    pending_stmt = (
        select(func.count(Tenant.id))
        .join(TenantMember, TenantMember.tenant_id == Tenant.id)
        .join(User, User.id == TenantMember.user_id)
        .where(TenantMember.is_owner.is_(True), User.password_hash == UNSET_PASSWORD_SENTINEL)
    )
    pending_res = await db.execute(pending_stmt)
    setup_pending_count = pending_res.scalar() or 0

    # Phase 2 Subscription status counts
    sub_counts = await db.execute(
        select(Subscription.status, func.count(Subscription.id)).group_by(Subscription.status)
    )
    status_map = {row[0].upper(): row[1] for row in sub_counts.all()}

    # MRR calculation for ACTIVE subscriptions
    mrr_stmt = (
        select(Plan.price_monthly, Plan.price_yearly, Subscription.billing_cycle)
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(Subscription.status == "ACTIVE")
    )
    mrr_res = await db.execute(mrr_stmt)
    mrr_total = 0.0
    for p_monthly, p_yearly, cycle in mrr_res.all():
        if cycle == "yearly":
            mrr_total += float(p_yearly or 0.0) / 12.0
        else:
            mrr_total += float(p_monthly or 0.0)

    return AdminDashboardStats(
        total_businesses=total_businesses,
        active_businesses=active_businesses,
        suspended_businesses=suspended_businesses,
        new_this_week=new_this_week,
        new_this_month=new_this_month,
        setup_pending_count=setup_pending_count,
        trial_count=status_map.get("TRIAL", 0),
        active_count=status_map.get("ACTIVE", 0),
        past_due_count=status_map.get("PAST_DUE", 0),
        grace_period_count=status_map.get("GRACE_PERIOD", 0),
        suspended_count=status_map.get("SUSPENDED", 0),
        expired_count=status_map.get("EXPIRED", 0),
        mrr=round(mrr_total, 2),
    )


@router.get("/businesses", response_model=PaginatedBusinessesResponse)
async def list_businesses(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedBusinessesResponse:
    query = (
        select(Tenant, User)
        .outerjoin(TenantMember, (TenantMember.tenant_id == Tenant.id) & (TenantMember.is_owner.is_(True)))
        .outerjoin(User, User.id == TenantMember.user_id)
    )

    if status_filter:
        query = query.where(Tenant.status == status_filter)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Tenant.name).like(term),
                func.lower(User.email).like(term),
                func.lower(User.full_name).like(term),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    offset = (page - 1) * page_size
    query = query.order_by(Tenant.created_at.desc()).offset(offset).limit(page_size)
    res = await db.execute(query)
    rows = res.all()

    items: list[BusinessListItem] = []
    for tenant, owner in rows:
        m_count_res = await db.execute(
            select(func.count(TenantMember.id)).where(TenantMember.tenant_id == tenant.id)
        )
        member_count = m_count_res.scalar() or 1
        setup_pending = bool(owner and owner.password_hash == UNSET_PASSWORD_SENTINEL)

        sub_stmt = (
            select(Subscription, Plan)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(Subscription.tenant_id == tenant.id)
            .order_by(Subscription.created_at.desc())
        )
        sub_res = await db.execute(sub_stmt)
        sub_row = sub_res.first()

        inv_status, last_sent_at = await get_tenant_invitation_status(db, tenant.id)

        items.append(
            BusinessListItem(
                id=tenant.id,
                name=tenant.name,
                slug=tenant.slug,
                status=getattr(tenant, "status", "Active"),
                created_via=getattr(tenant, "created_via", "SELF_SIGNUP"),
                created_at=tenant.created_at,
                member_count=member_count,
                owner_name=owner.full_name if owner else None,
                owner_email=owner.email if owner else None,
                setup_pending=setup_pending,
                suspended_at=getattr(tenant, "suspended_at", None),
                suspended_reason=getattr(tenant, "suspended_reason", None),
                current_plan_name=sub_row[1].name if sub_row else "Growth",
                subscription_status=sub_row[0].status if sub_row else "ACTIVE",
                invitation_email_status=inv_status,
                last_invitation_sent_at=last_sent_at,
            )
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedBusinessesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/businesses/{tenant_id}", response_model=BusinessDetail)
async def get_business_detail(
    tenant_id: UUID,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> BusinessDetail:
    return await _get_business_detail_dict(db, tenant_id)


@router.post("/businesses", response_model=BusinessDetail, status_code=status.HTTP_201_CREATED)
async def create_provisioned_business(
    body: CreateProvisionedBusinessRequest,
    request: Request,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> BusinessDetail:
    ip_addr = get_client_ip(request)
    u_agent = get_user_agent(request)

    tenant, _, _ = await create_tenant_and_owner(
        db,
        business_name=body.name,
        owner_name=body.owner_name,
        owner_email=body.owner_email,
        created_via="SUPER_ADMIN",
        password=None,
        ip_address=ip_addr,
        user_agent=u_agent,
        actor_id=current_admin.id,
        actor_name=current_admin.full_name or current_admin.email,
    )

    return await _get_business_detail_dict(db, tenant.id)


@router.put("/businesses/{tenant_id}/suspend", response_model=BusinessDetail)
async def suspend_business(
    tenant_id: UUID,
    body: SuspendBusinessRequest,
    request: Request,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> BusinessDetail:
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    tenant.status = "Suspended"
    tenant.suspended_at = datetime.now(UTC)
    tenant.suspended_reason = body.reason.strip()

    await log_audit_event(
        db,
        tenant_id=tenant.id,
        user_id=current_admin.id,
        actor_name=current_admin.full_name or current_admin.email,
        action="tenant.suspend",
        entity_type="tenant",
        entity_id=str(tenant.id),
        entity_label=tenant.name,
        details={"reason": body.reason.strip()},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )

    await db.commit()
    return await _get_business_detail_dict(db, tenant.id)


@router.put("/businesses/{tenant_id}/reactivate", response_model=BusinessDetail)
async def reactivate_business(
    tenant_id: UUID,
    request: Request,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> BusinessDetail:
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    tenant.status = "Active"
    tenant.suspended_at = None
    tenant.suspended_reason = None

    await log_audit_event(
        db,
        tenant_id=tenant.id,
        user_id=current_admin.id,
        actor_name=current_admin.full_name or current_admin.email,
        action="tenant.reactivate",
        entity_type="tenant",
        entity_id=str(tenant.id),
        entity_label=tenant.name,
        details={"action": "reactivated"},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )

    await db.commit()
    return await _get_business_detail_dict(db, tenant.id)


@router.post("/businesses/{tenant_id}/resend-invitation", response_model=BusinessDetail)
async def resend_invitation_endpoint(
    tenant_id: UUID,
    request: Request,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> BusinessDetail:
    ip_addr = get_client_ip(request)
    u_agent = get_user_agent(request)
    actor_name = current_admin.full_name or current_admin.email

    await resend_business_invitation(
        db,
        tenant_id=tenant_id,
        actor_id=current_admin.id,
        actor_name=actor_name,
        ip_address=ip_addr,
        user_agent=u_agent,
    )
    return await _get_business_detail_dict(db, tenant_id)


@router.get("/businesses/{tenant_id}/setup-link")
async def get_business_setup_link_endpoint(
    tenant_id: UUID,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Super Admin endpoint to fetch active setup link for a setup-pending business."""
    return await get_or_create_tenant_setup_link(db, tenant_id)


@router.post("/businesses/{tenant_id}/manual-verify-setup")
async def manual_verify_setup_endpoint(
    tenant_id: UUID,
    body: ManualVerifySetupRequest,
    request: Request,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Super Admin endpoint to manually complete account setup and set password for a business owner."""
    ip_addr = get_client_ip(request)
    u_agent = get_user_agent(request)
    actor_name = current_admin.full_name or current_admin.email

    owner, configured_password = await manual_verify_tenant_setup(
        db,
        tenant_id=tenant_id,
        password=body.password,
        actor_id=current_admin.id,
        actor_name=actor_name,
        ip_address=ip_addr,
        user_agent=u_agent,
    )

    detail = await _get_business_detail_dict(db, tenant_id)
    return {
        "business": detail,
        "owner_email": owner.email,
        "configured_password": configured_password,
        "message": f"Account setup manually completed for {owner.email}. Password set successfully.",
    }


# --- MODULES ---
@router.get("/modules", response_model=list[ModuleRead])
async def list_modules(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> list[ModuleRead]:
    res = await db.execute(select(Module).order_by(Module.key.asc()))
    return [ModuleRead.model_validate(m) for m in res.scalars().all()]


# --- PLANS & ENTITLEMENTS ---
@router.get("/plans", response_model=list[PlanRead])
async def list_plans(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> list[PlanRead]:
    stmt = (
        select(Plan)
        .options(selectinload(Plan.entitlements).selectinload(PlanEntitlement.module))
        .order_by(Plan.price_monthly.asc())
    )
    res = await db.execute(stmt)
    return [PlanRead.model_validate(p) for p in res.scalars().all()]


@router.post("/plans", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
async def create_plan(
    body: PlanCreate,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> PlanRead:
    plan = Plan(
        id=uuid4(),
        name=body.name.strip(),
        slug=body.slug.strip().lower(),
        code=body.slug.strip().lower(),
        description=body.description,
        price_monthly=body.price_monthly,
        price_yearly=body.price_yearly,
        user_limit=body.user_limit,
        trial_days=body.trial_days,
        is_active=body.is_active,
        is_public=body.is_public,
    )
    db.add(plan)
    await db.flush()

    # Create entitlements
    all_mods_res = await db.execute(select(Module))
    all_mods = all_mods_res.scalars().all()
    selected_set = set(body.module_ids)

    for mod in all_mods:
        ent = PlanEntitlement(
            id=uuid4(),
            plan_id=plan.id,
            module_id=mod.id,
            included=(mod.id in selected_set),
        )
        db.add(ent)

    await db.commit()
    res = await db.execute(
        select(Plan)
        .options(selectinload(Plan.entitlements).selectinload(PlanEntitlement.module))
        .where(Plan.id == plan.id)
    )
    return PlanRead.model_validate(res.scalar_one())


@router.put("/plans/{plan_id}", response_model=PlanRead)
async def update_plan(
    plan_id: UUID,
    body: PlanUpdate,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> PlanRead:
    res = await db.execute(
        select(Plan)
        .options(selectinload(Plan.entitlements).selectinload(PlanEntitlement.module))
        .where(Plan.id == plan_id)
    )
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if body.name is not None:
        plan.name = body.name.strip()
    if body.description is not None:
        plan.description = body.description
    if body.price_monthly is not None:
        plan.price_monthly = body.price_monthly
    if body.price_yearly is not None:
        plan.price_yearly = body.price_yearly
    if body.user_limit is not None:
        plan.user_limit = body.user_limit
    if body.trial_days is not None:
        plan.trial_days = body.trial_days
    if body.is_active is not None:
        plan.is_active = body.is_active
    if body.is_public is not None:
        plan.is_public = body.is_public

    if body.module_ids is not None:
        selected_set = set(body.module_ids)
        # Update entitlements
        ents_res = await db.execute(select(PlanEntitlement).where(PlanEntitlement.plan_id == plan_id))
        existing_ents = {e.module_id: e for e in ents_res.scalars().all()}
        all_mods_res = await db.execute(select(Module))
        for mod in all_mods_res.scalars().all():
            inc = mod.id in selected_set
            if mod.id in existing_ents:
                existing_ents[mod.id].included = inc
            else:
                db.add(PlanEntitlement(id=uuid4(), plan_id=plan_id, module_id=mod.id, included=inc))

    await db.commit()
    res = await db.execute(
        select(Plan)
        .options(selectinload(Plan.entitlements).selectinload(PlanEntitlement.module))
        .where(Plan.id == plan_id)
    )
    return PlanRead.model_validate(res.scalar_one())


# --- SUBSCRIPTIONS GOVERNANCE ---
@router.get("/subscriptions", response_model=list[SubscriptionRead])
async def list_admin_subscriptions(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[SubscriptionRead]:
    stmt = (
        select(Subscription)
        .options(selectinload(Subscription.plan).selectinload(Plan.entitlements).selectinload(PlanEntitlement.module))
    )
    if status_filter and status_filter.strip() and status_filter.upper() != "ALL":
        stmt = stmt.where(Subscription.status == status_filter.strip().upper())
    
    stmt = stmt.order_by(Subscription.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    subs = res.scalars().all()

    result: list[SubscriptionRead] = []
    for sub in subs:
        inc_mods: list[str] = []
        if sub.plan and sub.plan.entitlements:
            inc_mods = [
                e.module.key
                for e in sub.plan.entitlements
                if e.included and e.module and e.module.is_active
            ]

        result.append(
            SubscriptionRead(
                id=sub.id,
                tenant_id=sub.tenant_id,
                plan_id=sub.plan_id,
                status=sub.status,
                billing_cycle=sub.billing_cycle,
                trial_ends_at=sub.trial_ends_at,
                current_period_start=sub.current_period_start,
                current_period_end=sub.current_period_end,
                cancel_at_period_end=bool(sub.cancel_at_period_end),
                pending_downgrade_plan_id=sub.pending_downgrade_plan_id,
                plan=sub.plan,
                included_modules=inc_mods,
                user_count=1,
                user_limit=sub.plan.user_limit if sub.plan else None,
                created_at=sub.created_at,
                updated_at=sub.updated_at,
            )
        )
    return result


@router.post("/subscriptions/override", response_model=SubscriptionRead)
async def override_tenant_subscription(
    body: SubscriptionOverrideRequest,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> SubscriptionRead:
    """Super Admin manual plan or status override for a tenant."""
    sub_stmt = select(Subscription).where(Subscription.tenant_id == body.tenant_id)
    sub_res = await db.execute(sub_stmt)
    sub = sub_res.scalars().first()

    now = datetime.now(UTC)
    if not sub:
        sub = Subscription(
            id=uuid4(),
            tenant_id=body.tenant_id,
            plan_id=body.plan_id,
            status=body.status.upper(),
            billing_cycle=body.billing_cycle,
            current_period_start=now,
            current_period_end=now + timedelta(days=365),
        )
        db.add(sub)
    else:
        sub.plan_id = body.plan_id
        sub.status = body.status.upper()
        sub.billing_cycle = body.billing_cycle
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=365)

    db.add(
        AuditLog(
            id=uuid4(),
            tenant_id=body.tenant_id,
            user_id=current_admin.id,
            actor_name=current_admin.full_name or current_admin.email,
            action="subscription.override",
            entity_type="subscription",
            entity_id=str(sub.id),
            details={"plan_id": str(body.plan_id), "status": body.status},
        )
    )
    await db.commit()
    sub_service = SubscriptionService(db)
    return await sub_service.get_active_subscription(body.tenant_id)


# --- BILLING & PAYMENTS ---
@router.get("/billing/payments", response_model=list[BillingPaymentRead])
async def list_platform_payments(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> list[BillingPaymentRead]:
    res = await db.execute(select(BillingPayment).order_by(BillingPayment.created_at.desc()))
    return [BillingPaymentRead.model_validate(p) for p in res.scalars().all()]


@router.get("/billing/invoices", response_model=list[BillingInvoiceRead])
async def list_platform_invoices(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> list[BillingInvoiceRead]:
    res = await db.execute(select(BillingInvoice).order_by(BillingInvoice.created_at.desc()))
    return [BillingInvoiceRead.model_validate(i) for i in res.scalars().all()]


# --- COUPONS ---
@router.get("/coupons", response_model=list[CouponRead])
async def list_coupons(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> list[CouponRead]:
    res = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    return [CouponRead.model_validate(c) for c in res.scalars().all()]


@router.post("/coupons", response_model=CouponRead, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    body: CouponCreate,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> CouponRead:
    coupon = Coupon(
        id=uuid4(),
        code=body.code.strip().upper(),
        discount_type=body.discount_type.upper(),
        discount_value=body.discount_value,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        max_uses=body.max_uses,
        applicable_plan_ids=body.applicable_plan_ids,
        is_active=body.is_active,
    )
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return CouponRead.model_validate(coupon)


@router.put("/coupons/{coupon_id}", response_model=CouponRead)
async def update_coupon(
    coupon_id: UUID,
    body: CouponUpdate,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> CouponRead:
    res = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = res.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    if body.discount_type is not None:
        coupon.discount_type = body.discount_type.upper()
    if body.discount_value is not None:
        coupon.discount_value = body.discount_value
    if body.valid_from is not None:
        coupon.valid_from = body.valid_from
    if body.valid_until is not None:
        coupon.valid_until = body.valid_until
    if body.max_uses is not None:
        coupon.max_uses = body.max_uses
    if body.applicable_plan_ids is not None:
        coupon.applicable_plan_ids = body.applicable_plan_ids
    if body.is_active is not None:
        coupon.is_active = body.is_active

    await db.commit()
    await db.refresh(coupon)
    return CouponRead.model_validate(coupon)


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: UUID,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> None:
    res = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = res.scalar_one_or_none()
    if coupon:
        await db.delete(coupon)
        await db.commit()


# --- PLATFORM AUDIT LOGS & SETTINGS ---
@router.get("/audit-logs", response_model=PaginatedAuditLogsResponse)
async def get_platform_audit_logs(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    tenant_id: UUID | None = Query(None),
    user_id: UUID | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    search: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedAuditLogsResponse:
    query = select(AuditLog)

    if tenant_id:
        query = query.where(AuditLog.tenant_id == tenant_id)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(AuditLog.actor_name).like(term),
                func.lower(AuditLog.action).like(term),
                func.lower(AuditLog.entity_type).like(term),
                func.lower(AuditLog.entity_label).like(term),
            )
        )

    count_stmt = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    res = await db.execute(query)
    logs = res.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedAuditLogsResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _build_email_settings_response() -> EmailSettingsResponse:
    email_service = EmailService()
    connected, _ = email_service.verify_smtp_connection()
    conn_status = "connected" if connected else ("connection_failed" if email_service.is_configured() else "not_configured")
    cfg = email_service.get_safe_config(connection_status=conn_status)

    return EmailSettingsResponse(
        configured=cfg["configured"],
        provider=cfg["provider"],
        host=cfg["host"],
        port=cfg["port"],
        security=cfg["security"],
        username=cfg["username"],
        from_email=cfg["from_email"],
        from_name=cfg["from_name"],
        connection_status=cfg["connection_status"],
        last_test_at=_EMAIL_TEST_STATUS["last_test_at"],
        last_test_status=_EMAIL_TEST_STATUS["last_test_status"],
        last_test_recipient=_EMAIL_TEST_STATUS["last_test_recipient"],
    )


@router.get("/settings", response_model=PlatformSettingsResponse)
async def get_platform_settings(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
) -> PlatformSettingsResponse:
    settings_cfg = get_settings()
    return PlatformSettingsResponse(
        maintenance_mode=_PLATFORM_SETTINGS["maintenance_mode"],
        public_signup_enabled=_PLATFORM_SETTINGS["public_signup_enabled"],
        default_rate_limit=_PLATFORM_SETTINGS["default_rate_limit"],
        app_env=settings_cfg.app_env,
        updated_at=_PLATFORM_SETTINGS["updated_at"],
        email_settings=_build_email_settings_response(),
    )


@router.put("/settings", response_model=PlatformSettingsResponse)
async def update_platform_settings(
    body: PlatformSettingsUpdate,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
) -> PlatformSettingsResponse:
    if body.maintenance_mode is not None:
        _PLATFORM_SETTINGS["maintenance_mode"] = body.maintenance_mode
    if body.public_signup_enabled is not None:
        _PLATFORM_SETTINGS["public_signup_enabled"] = body.public_signup_enabled
    if body.default_rate_limit is not None:
        _PLATFORM_SETTINGS["default_rate_limit"] = body.default_rate_limit
    _PLATFORM_SETTINGS["updated_at"] = datetime.now(UTC)

    settings_cfg = get_settings()
    return PlatformSettingsResponse(
        maintenance_mode=_PLATFORM_SETTINGS["maintenance_mode"],
        public_signup_enabled=_PLATFORM_SETTINGS["public_signup_enabled"],
        default_rate_limit=_PLATFORM_SETTINGS["default_rate_limit"],
        app_env=settings_cfg.app_env,
        updated_at=_PLATFORM_SETTINGS["updated_at"],
        email_settings=_build_email_settings_response(),
    )


@router.get("/settings/email", response_model=EmailSettingsResponse)
async def get_email_settings_endpoint(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
) -> EmailSettingsResponse:
    return _build_email_settings_response()


@router.post("/settings/email/test")
async def send_test_email_endpoint(
    body: SendTestEmailRequest,
    request: Request,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    email_service = EmailService()
    success, message = email_service.send_test_email(body.recipient_email)

    now = datetime.now(UTC)
    _EMAIL_TEST_STATUS["last_test_at"] = now
    _EMAIL_TEST_STATUS["last_test_status"] = "PASS" if success else "FAIL"
    _EMAIL_TEST_STATUS["last_test_recipient"] = body.recipient_email

    audit_action = "email.test_sent" if success else "email.test_failed"
    await log_audit_event(
        db,
        tenant_id=None,
        user_id=current_admin.id,
        actor_name=current_admin.full_name or current_admin.email,
        action=audit_action,
        entity_type="system",
        entity_id="email_settings",
        entity_label="SMTP Configuration",
        details={"recipient_email": body.recipient_email, "message": message},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    await db.commit()

    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    return {"status": "success", "message": message}


@router.get("/usage")
async def get_admin_usage(
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    sort_by: str = Query("user_count"),
) -> dict[str, Any]:
    from app.services.usage_service import UsageService

    return await UsageService.get_all_tenants_usage(
        db, page=page, page_size=page_size, search=search, sort_by=sort_by
    )


@router.get("/usage/{tenant_id}")
async def get_admin_tenant_usage_detail(
    tenant_id: UUID,
    current_admin: Annotated[User, Depends(get_current_platform_admin)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from app.services.usage_service import UsageService

    metrics = await UsageService.get_tenant_usage_metrics(db, tenant_id)
    plan, sub = await UsageService.get_tenant_plan_and_sub(db, tenant_id)
    return {
        "tenant_id": str(tenant_id),
        "plan_name": plan.name if plan else "Growth",
        "plan_slug": plan.slug if plan else "growth",
        "subscription_status": sub.status if sub else "ACTIVE",
        "metrics": metrics,
    }
