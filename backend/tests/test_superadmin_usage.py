from datetime import datetime, timezone
from uuid import uuid4
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.crm import Customer
from app.models.domain import (
    Plan,
    Subscription,
    Tenant,
    TenantMember,
    User,
)
from app.models.hrm import Employee
from app.models.sales import Invoice
from app.services.hrm import HRMService
from app.services.usage_service import UsageService


@pytest.fixture
async def db_session():
    app.dependency_overrides.clear()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_usage_metrics_structure(db_session):
    """Verify that UsageService.get_tenant_usage_metrics returns the required metric keys."""
    uid = uuid4().hex[:6]
    tenant = Tenant(name=f"Metric Tenant {uid}", slug=f"metric-tenant-{uid}", status="Active")
    db_session.add(tenant)
    await db_session.flush()

    user = User(
        email=f"user_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Usage User",
    )
    db_session.add(user)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)

    customer = Customer(
        tenant_id=tenant.id,
        name=f"Customer {uid}",
        email=f"cust_{uid}@example.com",
    )
    db_session.add(customer)
    await db_session.flush()

    employee = Employee(
        tenant_id=tenant.id,
        name="Jane Doe",
        email=f"emp_{uid}@example.com",
        status="active",
    )
    db_session.add(employee)

    now = datetime.now(timezone.utc)
    invoice = Invoice(
        tenant_id=tenant.id,
        customer_id=customer.id,
        invoice_number=f"INV-{uid}",
        subtotal=150.0,
        total_amount=150.0,
        status="Paid",
        issue_date=now,
        due_date=now,
    )
    db_session.add(invoice)
    await db_session.commit()

    metrics = await UsageService.get_tenant_usage_metrics(db_session, tenant.id)

    assert "users" in metrics
    assert "customers" in metrics
    assert "employees" in metrics
    assert "invoices_this_month" in metrics

    assert metrics["users"]["used"] == 1
    assert metrics["customers"]["used"] == 1
    assert metrics["employees"]["used"] == 1
    assert metrics["invoices_this_month"]["used"] == 1


@pytest.mark.asyncio
async def test_check_tenant_user_limit_enforcement(db_session):
    """Verify that user limit enforcement blocks when user count reaches plan limit."""
    uid = uuid4().hex[:6]

    # Create a plan with user_limit = 2
    plan = Plan(
        name=f"Starter Plan {uid}",
        slug=f"starter-{uid}",
        code=f"starter_{uid}",
        price_monthly=100.0,
        price_yearly=1000.0,
        user_limit=2,
    )
    db_session.add(plan)
    await db_session.flush()

    tenant = Tenant(name=f"Limited Tenant {uid}", slug=f"limited-tenant-{uid}", status="Active")
    db_session.add(tenant)
    await db_session.flush()

    sub = Subscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status="ACTIVE",
    )
    db_session.add(sub)

    # Add 2 active members (reaching limit of 2)
    for i in range(2):
        u = User(
            email=f"limit_user_{i}_{uid}@example.com",
            password_hash=hash_password("Pass123$$"),
            full_name=f"User {i}",
        )
        db_session.add(u)
        await db_session.flush()
        tm = TenantMember(tenant_id=tenant.id, user_id=u.id, is_owner=False, status="active")
        db_session.add(tm)

    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await UsageService.check_tenant_user_limit(db_session, tenant.id)

    assert exc_info.value.status_code == 403
    assert f"Your {plan.name} plan includes up to 2 users — you're at 2/2." in exc_info.value.detail


@pytest.mark.asyncio
async def test_add_tenant_member_route_blocked_at_user_limit(db_session):
    """Verify POST /api/v1/tenants/members returns HTTP 403 when tenant user limit is reached."""
    uid = uuid4().hex[:6]

    plan = Plan(
        name=f"Starter Limit Plan {uid}",
        slug=f"starter-limit-{uid}",
        code=f"starter_limit_{uid}",
        price_monthly=100.0,
        user_limit=1,
    )
    db_session.add(plan)
    await db_session.flush()

    tenant = Tenant(name=f"Route Limit Tenant {uid}", slug=f"route-limit-tenant-{uid}", status="Active")
    db_session.add(tenant)
    await db_session.flush()

    sub = Subscription(tenant_id=tenant.id, plan_id=plan.id, status="ACTIVE")
    db_session.add(sub)

    # 1 member existing (reaching limit of 1)
    owner = User(
        email=f"owner_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Owner User",
    )
    db_session.add(owner)
    await db_session.flush()

    tm = TenantMember(tenant_id=tenant.id, user_id=owner.id, is_owner=True, status="active")
    db_session.add(tm)
    await db_session.commit()

    token = create_access_token(subject=str(owner.id))

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/tenants/members",
            json={"email": f"new_member_{uid}@example.com", "full_name": "New Member"},
            headers=headers,
        )
        assert res.status_code == 403
        data = res.json()
        assert f"Your {plan.name} plan includes up to 1 users — you're at 1/1." in data["detail"]


@pytest.mark.asyncio
async def test_check_tenant_user_limit_unlimited_plan(db_session):
    """Verify that user limit check passes when plan user_limit is None (unlimited)."""
    uid = uuid4().hex[:6]

    plan = Plan(
        name=f"Growth Unlimited {uid}",
        slug=f"growth-{uid}",
        code=f"growth_{uid}",
        price_monthly=500.0,
        price_yearly=5000.0,
        user_limit=None,
    )
    db_session.add(plan)
    await db_session.flush()

    tenant = Tenant(name=f"Unlimited Tenant {uid}", slug=f"unlimited-tenant-{uid}", status="Active")
    db_session.add(tenant)
    await db_session.flush()

    sub = Subscription(tenant_id=tenant.id, plan_id=plan.id, status="ACTIVE")
    db_session.add(sub)

    # Add 5 members
    for i in range(5):
        u = User(
            email=f"unlim_user_{i}_{uid}@example.com",
            password_hash=hash_password("Pass123$$"),
            full_name=f"Unlim User {i}",
        )
        db_session.add(u)
        await db_session.flush()
        tm = TenantMember(tenant_id=tenant.id, user_id=u.id, is_owner=False, status="active")
        db_session.add(tm)

    await db_session.commit()

    # Should not raise any exception
    await UsageService.check_tenant_user_limit(db_session, tenant.id)


@pytest.mark.asyncio
async def test_setup_employee_login_blocked_at_user_limit(db_session):
    """Verify setup_employee_login raises 403 when tenant user limit is reached."""
    uid = uuid4().hex[:6]

    plan = Plan(
        name=f"Strict Plan {uid}",
        slug=f"strict-{uid}",
        code=f"strict_{uid}",
        price_monthly=200.0,
        user_limit=1,
    )
    db_session.add(plan)
    await db_session.flush()

    tenant = Tenant(name=f"Strict Tenant {uid}", slug=f"strict-tenant-{uid}", status="Active")
    db_session.add(tenant)
    await db_session.flush()

    sub = Subscription(tenant_id=tenant.id, plan_id=plan.id, status="ACTIVE")
    db_session.add(sub)

    # 1 member existing
    u = User(email=f"existing_{uid}@example.com", password_hash=hash_password("Pass123$$"), full_name="Owner")
    db_session.add(u)
    await db_session.flush()
    tm = TenantMember(tenant_id=tenant.id, user_id=u.id, is_owner=True, status="active")
    db_session.add(tm)

    # Create employee without login
    employee = Employee(
        tenant_id=tenant.id,
        name="John Employee",
        email=f"new_emp_{uid}@example.com",
        status="active",
    )
    db_session.add(employee)
    await db_session.commit()

    hrm_service = HRMService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        await hrm_service.setup_employee_login(
            tenant.id, employee.id, f"new_emp_{uid}@example.com", "EmpPass123!", u.id, "Employee"
        )

    assert exc_info.value.status_code == 403
    assert f"Your {plan.name} plan includes up to 1 users — you're at 1/1." in exc_info.value.detail


@pytest.mark.asyncio
async def test_admin_usage_endpoints_permission_gating(db_session):
    """Verify GET /api/v1/admin/usage requires superadmin rights."""
    uid = uuid4().hex[:6]

    # Regular user
    regular_user = User(
        email=f"regular_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Regular User",
        is_platform_admin=False,
    )
    # Admin user
    admin_user = User(
        email=f"admin_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Admin User",
        is_platform_admin=True,
    )
    db_session.add_all([regular_user, admin_user])
    await db_session.commit()

    reg_token = create_access_token(subject=str(regular_user.id))
    admin_token = create_access_token(subject=str(admin_user.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Non-admin request -> 403
        res_403 = await client.get("/api/v1/admin/usage", headers={"Authorization": f"Bearer {reg_token}"})
        assert res_403.status_code == 403

        # Admin request -> 200
        res_200 = await client.get("/api/v1/admin/usage", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_200.status_code == 200
        data = res_200.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data


@pytest.mark.asyncio
async def test_cross_tenant_usage_isolation(db_session):
    """Verify metric isolation between different tenants."""
    uid = uuid4().hex[:6]

    tenant_a = Tenant(name=f"Tenant A {uid}", slug=f"tenant-a-{uid}", status="Active")
    tenant_b = Tenant(name=f"Tenant B {uid}", slug=f"tenant-b-{uid}", status="Active")
    db_session.add_all([tenant_a, tenant_b])
    await db_session.flush()

    # Tenant A has 1 customer
    cust_a = Customer(tenant_id=tenant_a.id, name="Cust A", email=f"a_{uid}@test.com")
    # Tenant B has 3 customers
    cust_b1 = Customer(tenant_id=tenant_b.id, name="Cust B1", email=f"b1_{uid}@test.com")
    cust_b2 = Customer(tenant_id=tenant_b.id, name="Cust B2", email=f"b2_{uid}@test.com")
    cust_b3 = Customer(tenant_id=tenant_b.id, name="Cust B3", email=f"b3_{uid}@test.com")
    db_session.add_all([cust_a, cust_b1, cust_b2, cust_b3])
    await db_session.commit()

    metrics_a = await UsageService.get_tenant_usage_metrics(db_session, tenant_a.id)
    metrics_b = await UsageService.get_tenant_usage_metrics(db_session, tenant_b.id)

    assert metrics_a["customers"]["used"] == 1
    assert metrics_b["customers"]["used"] == 3
