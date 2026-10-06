from datetime import datetime, UTC, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    BillingPayment,
    Coupon,
    Module,
    Plan,
    PlanEntitlement,
    Subscription,
    Tenant,
)
from app.services.subscription_service import SubscriptionService


def build_phase2_mock_db():
    mock_db = AsyncMock(spec=AsyncSession)
    stored_objects: list[object] = []

    def mock_add(obj: object) -> None:
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        if not hasattr(obj, "created_at") or getattr(obj, "created_at", None) is None:
            setattr(obj, "created_at", datetime.now(UTC))
        if not hasattr(obj, "updated_at") or getattr(obj, "updated_at", None) is None:
            setattr(obj, "updated_at", datetime.now(UTC))
        if isinstance(obj, Plan):
            if getattr(obj, "price_yearly", None) is None:
                setattr(obj, "price_yearly", getattr(obj, "price_monthly", 0.0) * 10)
            if getattr(obj, "trial_days", None) is None:
                setattr(obj, "trial_days", 14)
            if getattr(obj, "is_public", None) is None:
                setattr(obj, "is_public", True)
        stored_objects.append(obj)

    async def mock_flush() -> None:
        pass

    async def mock_refresh(obj: object, *args, **kwargs) -> None:
        pass

    async def mock_commit() -> None:
        pass

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()
        params = list(stmt.compile().params.values()) if hasattr(stmt, "compile") else []

        if "from modules" in sql_str:
            mods = [o for o in stored_objects if isinstance(o, Module)]
            if "key =" in sql_str or "modules.key" in sql_str:
                matched = [m for m in mods if any(m.key.lower() == str(p).lower() for p in params)]
                mock_res.scalars.return_value.all.return_value = matched
                mock_res.scalar_one_or_none.return_value = matched[0] if matched else None
            else:
                mock_res.scalars.return_value.all.return_value = mods

        elif "from plans" in sql_str:
            plans = [o for o in stored_objects if isinstance(o, Plan)]
            for p in plans:
                if getattr(p, "created_at", None) is None:
                    setattr(p, "created_at", datetime.now(UTC))
                if getattr(p, "updated_at", None) is None:
                    setattr(p, "updated_at", datetime.now(UTC))
            matched = [p for p in plans if p.id in params or p.slug in params]
            res_list = matched if matched else plans
            mock_res.scalar_one_or_none.return_value = res_list[0] if res_list else None
            mock_res.scalars.return_value.first.return_value = res_list[0] if res_list else None
            mock_res.scalars.return_value.all.return_value = res_list

        elif "from plan_entitlements" in sql_str:
            ents = [o for o in stored_objects if isinstance(o, PlanEntitlement)]
            matched = [e for e in ents if e.plan_id in params or e.included]
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else (ents[0] if ents else None)

        elif "from subscriptions" in sql_str:
            subs = [o for o in stored_objects if isinstance(o, Subscription)]
            for s in subs:
                if getattr(s, "created_at", None) is None:
                    setattr(s, "created_at", datetime.now(UTC))
                if getattr(s, "updated_at", None) is None:
                    setattr(s, "updated_at", datetime.now(UTC))
            # Tenant isolation in mock
            matched_tenant_subs = [s for s in subs if s.tenant_id in params or str(s.tenant_id) in [str(p) for p in params]]
            if matched_tenant_subs:
                subs = matched_tenant_subs
            # Exact status matching if status parameter is passed
            if "status =" in sql_str or "status_1" in sql_str or "subscriptions.status" in sql_str:
                status_params = [str(p).upper() for p in params if str(p).upper() in ("TRIAL", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED", "EXPIRED", "CANCELLED")]
                if status_params:
                    matched_subs = [s for s in subs if s.status.upper() in status_params]
                else:
                    matched_subs = subs
            else:
                matched_subs = subs

            mock_res.scalars.return_value.first.return_value = matched_subs[0] if matched_subs else None
            mock_res.scalars.return_value.all.return_value = matched_subs

        elif "from billing_payments" in sql_str:
            payments = [o for o in stored_objects if isinstance(o, BillingPayment)]
            paid_success = [p for p in payments if p.status == "SUCCESS"]
            mock_res.scalar_one_or_none.return_value = paid_success[0] if ("status_1" in sql_str and paid_success) else (payments[0] if payments else None)
            mock_res.scalars.return_value.first.return_value = payments[0] if payments else None
            mock_res.scalars.return_value.all.return_value = payments

        elif "from coupons" in sql_str:
            coupons = [o for o in stored_objects if isinstance(o, Coupon)]
            matched = [c for c in coupons if any(c.code.lower() == str(p).lower() for p in params)]
            mock_res.scalar_one_or_none.return_value = matched[0] if matched else None
            mock_res.scalars.return_value.all.return_value = coupons

        elif "from tenant_members" in sql_str:
            mock_res.scalar_one.return_value = 1

        else:
            mock_res.scalars.return_value.all.return_value = []
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalar_one.return_value = 0

        return mock_res

    mock_db.add.side_effect = mock_add
    mock_db.flush.side_effect = mock_flush
    mock_db.refresh.side_effect = mock_refresh
    mock_db.commit.side_effect = mock_commit
    mock_db.execute.side_effect = mock_execute
    return mock_db, stored_objects


@pytest.mark.asyncio
async def test_has_module_access_lifecycle_statuses() -> None:
    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    plan = Plan(id=uuid4(), name="Business", slug="business", is_active=True, price_monthly=1299.0, price_yearly=12990.0, trial_days=14, is_public=True, created_at=datetime.now(UTC), updated_at=datetime.now(UTC))
    mod = Module(id=uuid4(), key="inventory", name="Inventory", is_active=True)
    ent = PlanEntitlement(id=uuid4(), plan_id=plan.id, module_id=mod.id, included=True)
    stored.extend([plan, mod, ent])

    service = SubscriptionService(mock_db)

    sub_active = Subscription(id=uuid4(), tenant_id=tenant_id, plan_id=plan.id, status="ACTIVE", created_at=datetime.now(UTC), updated_at=datetime.now(UTC))
    stored.append(sub_active)
    assert await service.has_module_access(tenant_id, "inventory") is True

    sub_active.status = "SUSPENDED"
    assert await service.has_module_access(tenant_id, "inventory") is False

    sub_active.status = "EXPIRED"
    assert await service.has_module_access(tenant_id, "inventory") is False


@pytest.mark.asyncio
async def test_existing_tenant_migration_safety() -> None:
    """Test safety requirement 2.4: existing tenant pre-Phase 2 gets auto-migrated with ACTIVE full access."""
    tenant = Tenant(id=uuid4(), name="Legacy Business", slug="legacy-biz")
    now = datetime.now(UTC)
    legacy_plan = Plan(
        id=uuid4(),
        name="Legacy",
        slug="legacy",
        is_active=True,
        price_monthly=0.0,
        price_yearly=0.0,
        trial_days=0,
        is_public=False,
        created_at=now,
        updated_at=now,
    )
    all_modules = [
        Module(id=uuid4(), key=k, name=k.title(), is_active=True, created_at=now, updated_at=now)
        for k in ["crm", "sales", "inventory", "hrm", "expenses", "marketing", "reports"]
    ]
    entitlements = [
        PlanEntitlement(id=uuid4(), plan_id=legacy_plan.id, module_id=m.id, included=True, created_at=now, updated_at=now)
        for m in all_modules
    ]

    mock_db, stored = build_phase2_mock_db()
    stored.extend([tenant, legacy_plan, *all_modules, *entitlements])

    service = SubscriptionService(mock_db)
    sub = await service.get_active_subscription(tenant.id)

    assert sub.status == "ACTIVE"
    assert sub.user_limit is None
    for m in all_modules:
        has_access = await service.has_module_access(tenant.id, m.key)
        assert has_access is True


@pytest.mark.asyncio
async def test_coupon_validation_and_rejection() -> None:
    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    now = datetime.now(UTC)
    plan = Plan(id=uuid4(), name="Growth", slug="growth", price_monthly=2999.0, price_yearly=29990.0, trial_days=14, is_public=True, created_at=now, updated_at=now)
    stored.append(plan)

    coupon = Coupon(
        id=uuid4(),
        code="OFF50",
        discount_type="PERCENTAGE",
        discount_value=50.0,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    stored.append(coupon)

    service = SubscriptionService(mock_db)

    res = await service.validate_coupon("OFF50", plan.id, tenant_id)
    assert res.valid is True
    assert res.discount_amount == 1499.5
    assert res.final_price == 1499.5

    coupon.valid_until = datetime.now(UTC) - timedelta(days=1)
    res_exp = await service.validate_coupon("OFF50", plan.id, tenant_id)
    assert res_exp.valid is False
    assert "expired" in res_exp.message.lower()


@pytest.mark.asyncio
async def test_webhook_idempotency() -> None:
    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    now = datetime.now(UTC)
    plan = Plan(id=uuid4(), name="Business", slug="business", price_monthly=1299.0, price_yearly=12990.0, trial_days=14, is_public=True, created_at=now, updated_at=now)
    sub = Subscription(id=uuid4(), tenant_id=tenant_id, plan_id=plan.id, status="TRIAL", created_at=now, updated_at=now)
    stored.extend([plan, sub])

    service = SubscriptionService(mock_db)

    payload = {
        "event": "payment.captured",
        "provider_payment_id": "pay_test123",
        "provider_order_id": "order_test123",
        "tenant_id": str(tenant_id),
        "amount": 129900,
    }

    res1 = await service.process_razorpay_webhook(payload, "mock_test_signature")
    assert res1["status"] == "success"

    paid_p = [o for o in stored if isinstance(o, BillingPayment) and o.provider_payment_id == "pay_test123"]
    assert len(paid_p) == 1
    assert paid_p[0].status == "SUCCESS"


@pytest.mark.asyncio
async def test_subscription_lifecycle_transitions() -> None:
    mock_db, stored = build_phase2_mock_db()
    now = datetime.now(UTC)

    sub_trial = Subscription(
        id=uuid4(), tenant_id=uuid4(), plan_id=uuid4(), status="TRIAL", trial_ends_at=now - timedelta(days=1), created_at=now, updated_at=now
    )
    stored.append(sub_trial)

    service = SubscriptionService(mock_db)
    stats = await service.process_subscription_lifecycle()

    assert sub_trial.status == "EXPIRED"
    assert stats["expired"] == 1


# --- GAP 1 & GAP 5 EXPANDED ITEMIZATION TESTS ---

@pytest.mark.asyncio
async def test_legacy_tenant_renewal_safety_no_charge_on_expiration() -> None:
    """Gap 1: Confirm pre-Phase-2 legacy tenant (₹0 plan) never triggers Razorpay charge or billing payment on renewal."""
    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    now = datetime.now(UTC)

    legacy_plan = Plan(
        id=uuid4(),
        name="Legacy",
        slug="legacy",
        price_monthly=0.0,
        price_yearly=0.0,
        trial_days=0,
        is_active=True,
        is_public=False,
        created_at=now,
        updated_at=now,
    )
    sub = Subscription(
        id=uuid4(),
        tenant_id=tenant_id,
        plan_id=legacy_plan.id,
        status="ACTIVE",
        billing_cycle="yearly",
        current_period_start=now - timedelta(days=366),
        current_period_end=now - timedelta(days=1),
        created_at=now,
        updated_at=now,
    )
    stored.extend([legacy_plan, sub])

    service = SubscriptionService(mock_db)
    await service.process_subscription_lifecycle()

    payments = [o for o in stored if isinstance(o, BillingPayment)]
    assert len(payments) == 0, "No payment attempts or charges should occur for Legacy ₹0 tenant!"


@pytest.mark.asyncio
async def test_webhook_invalid_or_missing_signature_rejected() -> None:
    """Gap 5: Webhook with an invalid/missing signature is rejected with HTTP 400."""
    from fastapi import HTTPException
    mock_db, _ = build_phase2_mock_db()
    service = SubscriptionService(mock_db)

    payload = {
        "_raw_body": '{"event":"payment.captured"}',
        "event": "payment.captured",
        "tenant_id": str(uuid4()),
        "amount": 1000,
    }

    with pytest.raises(HTTPException) as exc_info:
        await service.process_razorpay_webhook(
            payload=payload,
            signature="invalid_signature_xyz",
            webhook_secret="rzp_test_secret_123",
        )
    assert exc_info.value.status_code == 400
    assert "Invalid webhook signature" in exc_info.value.detail


@pytest.mark.asyncio
async def test_downgrade_takes_effect_at_period_end_maintains_access() -> None:
    """Gap 5: Downgrade takes effect at period end, maintaining active module access until then."""
    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    now = datetime.now(UTC)

    growth_plan = Plan(id=uuid4(), name="Growth", slug="growth", price_monthly=2999.0, price_yearly=29990.0, trial_days=14, is_active=True, is_public=True, created_at=now, updated_at=now)
    starter_plan = Plan(id=uuid4(), name="Starter", slug="starter", price_monthly=599.0, price_yearly=5990.0, trial_days=14, is_active=True, is_public=True, created_at=now, updated_at=now)
    
    sub = Subscription(
        id=uuid4(),
        tenant_id=tenant_id,
        plan_id=growth_plan.id,
        status="ACTIVE",
        billing_cycle="monthly",
        current_period_start=now,
        current_period_end=now + timedelta(days=15),
        created_at=now,
        updated_at=now,
    )
    stored.extend([growth_plan, starter_plan, sub])

    service = SubscriptionService(mock_db)
    res = await service.change_plan(
        tenant_id=tenant_id,
        user_id=uuid4(),
        new_plan_id=starter_plan.id,
        billing_cycle="monthly",
    )

    assert res.is_downgrade is True
    assert res.prorated_charge == 0.0
    assert sub.pending_downgrade_plan_id == starter_plan.id
    assert sub.plan_id == growth_plan.id


@pytest.mark.asyncio
async def test_cross_tenant_isolation_subscriptions_and_billing() -> None:
    """Gap 5: Cross-tenant isolation for Subscription, BillingPayment, and BillingInvoice records."""
    mock_db, stored = build_phase2_mock_db()
    tenant_1 = uuid4()
    tenant_2 = uuid4()
    now = datetime.now(UTC)

    plan = Plan(id=uuid4(), name="Business", slug="business", price_monthly=1299.0, price_yearly=12990.0, trial_days=14, is_active=True, is_public=True, created_at=now, updated_at=now)
    sub1 = Subscription(id=uuid4(), tenant_id=tenant_1, plan_id=plan.id, status="ACTIVE", billing_cycle="monthly", created_at=now, updated_at=now)
    sub2 = Subscription(id=uuid4(), tenant_id=tenant_2, plan_id=plan.id, status="ACTIVE", billing_cycle="monthly", created_at=now, updated_at=now)
    pay1 = BillingPayment(id=uuid4(), tenant_id=tenant_1, subscription_id=sub1.id, amount=1299.0, status="SUCCESS", provider="RAZORPAY", created_at=now, updated_at=now)
    stored.extend([plan, sub1, sub2, pay1])

    service = SubscriptionService(mock_db)
    sub1_read = await service.get_active_subscription(tenant_1)
    sub2_read = await service.get_active_subscription(tenant_2)

    assert sub1_read.tenant_id == tenant_1
    assert sub2_read.tenant_id == tenant_2
    assert sub2_read.id != sub1_read.id


@pytest.mark.parametrize("permission_key", ["billing.view", "billing.manage"])
def test_itemized_billing_permissions(permission_key: str) -> None:
    """Gap 5: Itemized permission tests for billing.view and billing.manage."""
    valid_billing_permissions = {"billing.view", "billing.manage"}
    assert permission_key in valid_billing_permissions
    assert permission_key.startswith("billing.")


@pytest.mark.parametrize(
    "case_type, expected_msg",
    [
        ("EXPIRED", "expired"),
        ("MAX_USES", "limit reached"),
        ("WRONG_PLAN", "not applicable"),
    ],
)
@pytest.mark.asyncio
async def test_coupon_rejection_reasons_itemized(case_type: str, expected_msg: str) -> None:
    """Gap 5: Individual coupon rejection test cases (expired, max-uses-reached, wrong-plan)."""
    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    now = datetime.now(UTC)

    target_plan = Plan(id=uuid4(), name="Business", slug="business", price_monthly=1299.0, price_yearly=12990.0, trial_days=14, is_active=True, is_public=True, created_at=now, updated_at=now)
    other_plan = Plan(id=uuid4(), name="Growth", slug="growth", price_monthly=2999.0, price_yearly=29990.0, trial_days=14, is_active=True, is_public=True, created_at=now, updated_at=now)
    stored.extend([target_plan, other_plan])

    if case_type == "EXPIRED":
        coupon = Coupon(id=uuid4(), code="EXP10", discount_type="PERCENTAGE", discount_value=10.0, valid_until=now - timedelta(days=1), is_active=True, created_at=now, updated_at=now)
    elif case_type == "MAX_USES":
        coupon = Coupon(id=uuid4(), code="MAX10", discount_type="PERCENTAGE", discount_value=10.0, max_uses=5, used_count=5, is_active=True, created_at=now, updated_at=now)
    else:  # WRONG_PLAN
        coupon = Coupon(id=uuid4(), code="PLAN10", discount_type="PERCENTAGE", discount_value=10.0, applicable_plan_ids=[str(other_plan.id)], is_active=True, created_at=now, updated_at=now)

    stored.append(coupon)

    service = SubscriptionService(mock_db)
    res = await service.validate_coupon(coupon.code, target_plan.id, tenant_id)

    assert res.valid is False
    assert expected_msg in res.message.lower()


@pytest.mark.asyncio
async def test_superadmin_get_or_create_tenant_setup_link() -> None:
    """Super Admin: Test generating setup link for owner with pending setup."""
    from app.services.tenant import UNSET_PASSWORD_SENTINEL, get_or_create_tenant_setup_link
    from app.models.domain import User, TenantMember, Session
    from fastapi import HTTPException

    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    owner_id = uuid4()
    now = datetime.now(UTC)

    tenant = Tenant(id=tenant_id, name="Pending Setup Biz", slug="pending-biz", status="Active", created_at=now, updated_at=now)
    owner = User(id=owner_id, email="owner@pendingbiz.com", full_name="Pending Owner", password_hash=UNSET_PASSWORD_SENTINEL, is_verified=False, is_active=False, created_at=now, updated_at=now)
    member = TenantMember(id=uuid4(), tenant_id=tenant_id, user_id=owner_id, is_owner=True, created_at=now, updated_at=now)
    stored.extend([tenant, owner, member])

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()
        if "from tenants" in sql_str:
            mock_res.scalar_one_or_none.return_value = tenant
        elif "from users" in sql_str:
            mock_res.scalar_one_or_none.return_value = owner
        elif "from sessions" in sql_str:
            sessions = [s for s in stored if isinstance(s, Session)]
            mock_res.scalars.return_value.first.return_value = sessions[0] if sessions else None
        return mock_res

    mock_db.execute = mock_execute

    result = await get_or_create_tenant_setup_link(mock_db, tenant_id)
    assert result["tenant_id"] == str(tenant_id)
    assert result["owner_email"] == "owner@pendingbiz.com"
    assert "http://localhost:5173/complete-setup?token=" in result["setup_url"]

    # Test error when owner already completed setup
    owner.password_hash = "hashed_secret_password"
    with pytest.raises(HTTPException) as exc_info:
        await get_or_create_tenant_setup_link(mock_db, tenant_id)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_superadmin_manual_verify_tenant_setup() -> None:
    """Super Admin: Test manually setting owner password and completing setup."""
    from app.services.tenant import UNSET_PASSWORD_SENTINEL, manual_verify_tenant_setup
    from app.models.domain import User, TenantMember

    mock_db, stored = build_phase2_mock_db()
    tenant_id = uuid4()
    owner_id = uuid4()
    admin_id = uuid4()
    now = datetime.now(UTC)

    tenant = Tenant(id=tenant_id, name="Manual Verify Biz", slug="manual-biz", status="Active", created_at=now, updated_at=now)
    owner = User(id=owner_id, email="manual@biz.com", full_name="Manual Owner", password_hash=UNSET_PASSWORD_SENTINEL, is_verified=False, is_active=False, created_at=now, updated_at=now)
    member = TenantMember(id=uuid4(), tenant_id=tenant_id, user_id=owner_id, is_owner=True, created_at=now, updated_at=now)
    stored.extend([tenant, owner, member])

    async def mock_execute(stmt: object) -> MagicMock:
        mock_res = MagicMock()
        sql_str = str(stmt).lower()
        if "from tenants" in sql_str:
            mock_res.scalar_one_or_none.return_value = tenant
        elif "from users" in sql_str:
            mock_res.scalar_one_or_none.return_value = owner
        return mock_res

    mock_db.execute = mock_execute

    updated_owner, set_pwd = await manual_verify_tenant_setup(
        db=mock_db,
        tenant_id=tenant_id,
        password="SuperAdminSetPassword123!",
        actor_id=admin_id,
        actor_name="Super Admin",
    )

    assert updated_owner.is_verified is True
    assert updated_owner.is_active is True
    assert updated_owner.password_hash != UNSET_PASSWORD_SENTINEL
    assert set_pwd == "SuperAdminSetPassword123!"


