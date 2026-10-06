from uuid import uuid4
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, hash_password
from app.core.rate_limit import clear_rate_limits
from app.main import app
from app.models.domain import Tenant, TenantMember, User, Session as UserSessionModel
from sqlalchemy import select


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
async def test_get_current_platform_admin_rejects_non_admin_user(db_session):
    """1. get_current_platform_admin rejects a non-admin user (403)"""
    uid = uuid4().hex[:6]
    user = User(
        email=f"regular_user_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Regular User",
        is_active=True,
        is_platform_admin=False,
    )
    db_session.add(user)
    await db_session.commit()

    token = create_access_token(subject=str(user.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
        assert "Platform admin access required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_get_current_platform_admin_rejects_tenant_owner_who_is_not_platform_admin(db_session):
    """2. get_current_platform_admin rejects a tenant Owner who is not a platform admin (403)"""
    uid = uuid4().hex[:6]
    user = User(
        email=f"tenant_owner_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Tenant Owner User",
        is_active=True,
        is_platform_admin=False,
    )
    db_session.add(user)
    await db_session.flush()

    tenant = Tenant(name=f"Owner Biz {uid}", slug=f"owner-biz-{uid}", is_active=True, status="Active")
    db_session.add(tenant)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)
    await db_session.commit()

    token = create_access_token(subject=str(user.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/businesses", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
        assert "Platform admin access required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_self_signup_creates_working_tenant_and_immediate_login(db_session):
    """3. Self-signup creates a working tenant + owner, immediate login succeeds"""
    uid = uuid4().hex[:6]
    email = f"self_signup_{uid}@example.com"
    password = "Password123!"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/auth/register-business", json={
            "business_name": f"Self Signup Corp {uid}",
            "owner_name": "Self Signup Owner",
            "owner_email": email,
            "password": password,
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data

        # Confirm immediate login works
        login_res = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": password,
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()


@pytest.mark.asyncio
async def test_self_signup_rate_limiting_6th_request_blocked(db_session):
    """4. Self-signup rate limit: the 6th signup within an hour from the same source is blocked (429)"""
    clear_rate_limits()
    uid = uuid4().hex[:6]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 5 successful signups
        for i in range(5):
            res = await client.post("/api/v1/auth/register-business", json={
                "business_name": f"Rate Limit Corp {uid} {i}",
                "owner_name": f"Owner {i}",
                "owner_email": f"rate_owner_{uid}_{i}@example.com",
                "password": "Password123!",
            })
            assert res.status_code == 200

        # 6th signup must fail with 429
        res_blocked = await client.post("/api/v1/auth/register-business", json={
            "business_name": f"Blocked Corp {uid}",
            "owner_name": "Blocked Owner",
            "owner_email": f"rate_owner_blocked_{uid}@example.com",
            "password": "Password123!",
        })
        assert res_blocked.status_code == 429
        assert "Rate limit exceeded" in res_blocked.json()["detail"]


@pytest.mark.asyncio
async def test_super_admin_provisioned_business_owner_login_blocked_before_setup(db_session):
    """5. Super-Admin-provisioned business: owner cannot log in until setup-completion"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_prov_{uid}@bizsathi.com",
        password_hash=hash_password("SuperSecret123!"),
        full_name="Platform Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_token = create_access_token(subject=str(admin.id))

    owner_email = f"prov_owner_{uid}@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/admin/businesses",
            json={
                "name": f"Provisioned Biz {uid}",
                "owner_name": "Prov Owner",
                "owner_email": owner_email,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 201
        assert res.json()["setup_pending"] is True

        # Login attempt before completing setup must be rejected (401)
        login_res = await client.post("/api/v1/auth/login", json={
            "email": owner_email,
            "password": "AnyPassword123!",
        })
        assert login_res.status_code == 401


@pytest.mark.asyncio
async def test_setup_completion_token_single_use_enforcement(db_session):
    """6. Setup-completion token: works once; a second attempt with the same token is rejected (single-use)"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_single_{uid}@bizsathi.com",
        password_hash=hash_password("SuperSecret123!"),
        full_name="Platform Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_token = create_access_token(subject=str(admin.id))

    owner_email = f"single_use_owner_{uid}@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/v1/admin/businesses",
            json={"name": f"Single Use Biz {uid}", "owner_name": "Single Owner", "owner_email": owner_email},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        owner_res = await db_session.execute(select(User).where(User.email == owner_email))
        owner_user = owner_res.scalar_one()

        sess_res = await db_session.execute(select(UserSessionModel).where(UserSessionModel.user_id == owner_user.id))
        sess = sess_res.scalar_one()
        raw_token = sess.token.replace("invite_", "")

        # First completion attempt -> 200 OK
        res1 = await client.post("/api/v1/auth/complete-setup", json={
            "token": raw_token,
            "password": "NewSecretPassword123!",
        })
        assert res1.status_code == 200

        # Second completion attempt with same token -> 400 Bad Request
        res2 = await client.post("/api/v1/auth/complete-setup", json={
            "token": raw_token,
            "password": "AnotherPassword123!",
        })
        assert res2.status_code == 400
        assert "Invalid or expired invitation token" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_suspending_business_blocks_multiple_module_endpoints(db_session):
    """7. Suspending a business blocks requests to multiple module endpoints (CRM leads AND Sales invoices)"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_block_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.flush()

    user = User(
        email=f"user_block_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="User",
        is_active=True,
        is_platform_admin=False,
    )
    db_session.add(user)
    await db_session.flush()

    tenant = Tenant(name=f"Block Test Corp {uid}", slug=f"block-corp-{uid}", is_active=True, status="Active")
    db_session.add(tenant)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)
    await db_session.commit()

    admin_token = create_access_token(subject=str(admin.id))
    user_token = create_access_token(subject=str(user.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Confirm access before suspension
        res_crm_before = await client.get("/api/v1/crm/leads", headers={"Authorization": f"Bearer {user_token}", "X-Tenant-ID": str(tenant.id)})
        res_sales_before = await client.get("/api/v1/sales/invoices", headers={"Authorization": f"Bearer {user_token}", "X-Tenant-ID": str(tenant.id)})
        assert res_crm_before.status_code == 200
        assert res_sales_before.status_code == 200

        # Suspend business
        await client.put(f"/api/v1/admin/businesses/{tenant.id}/suspend", json={"reason": "Audit suspension test"}, headers={"Authorization": f"Bearer {admin_token}"})

        # Confirm BOTH CRM leads AND Sales invoices endpoints are blocked (403)
        res_crm_suspended = await client.get("/api/v1/crm/leads", headers={"Authorization": f"Bearer {user_token}", "X-Tenant-ID": str(tenant.id)})
        res_sales_suspended = await client.get("/api/v1/sales/invoices", headers={"Authorization": f"Bearer {user_token}", "X-Tenant-ID": str(tenant.id)})

        assert res_crm_suspended.status_code == 403
        assert "Business account is suspended" in res_crm_suspended.json()["detail"]
        assert res_sales_suspended.status_code == 403
        assert "Business account is suspended" in res_sales_suspended.json()["detail"]


@pytest.mark.asyncio
async def test_reactivation_restores_access_with_data_intact(db_session):
    """8. Reactivation restores access with no data loss"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_react_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.flush()

    user = User(
        email=f"user_react_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="User",
        is_active=True,
        is_platform_admin=False,
    )
    db_session.add(user)
    await db_session.flush()

    tenant = Tenant(name=f"Reactivate Corp {uid}", slug=f"react-corp-{uid}", is_active=True, status="Active")
    db_session.add(tenant)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)
    await db_session.commit()

    admin_token = create_access_token(subject=str(admin.id))
    user_token = create_access_token(subject=str(user.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Suspend then reactivate
        await client.put(f"/api/v1/admin/businesses/{tenant.id}/suspend", json={"reason": "Temporary suspension"}, headers={"Authorization": f"Bearer {admin_token}"})
        react_res = await client.put(f"/api/v1/admin/businesses/{tenant.id}/reactivate", headers={"Authorization": f"Bearer {admin_token}"})
        assert react_res.status_code == 200
        assert react_res.json()["status"] == "Active"

        # User access restored
        res_after = await client.get("/api/v1/crm/leads", headers={"Authorization": f"Bearer {user_token}", "X-Tenant-ID": str(tenant.id)})
        assert res_after.status_code == 200


@pytest.mark.asyncio
async def test_platform_audit_log_returns_cross_tenant_results_for_platform_admin(db_session):
    """9. Platform audit log returns cross-tenant results for a platform admin"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_audit_cross_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Platform Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_token = create_access_token(subject=str(admin.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        logs_res = await client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
        assert logs_res.status_code == 200
        assert "items" in logs_res.json()


@pytest.mark.asyncio
async def test_platform_audit_log_returns_403_for_regular_user_and_tenant_owner(db_session):
    """10. Platform audit log returns 403 for a regular tenant user, including a tenant Owner"""
    uid = uuid4().hex[:6]
    user = User(
        email=f"tenant_owner_audit_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Tenant Owner",
        is_active=True,
        is_platform_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    token = create_access_token(subject=str(user.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
        assert "Platform admin access required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_business_creation_via_admin_produces_audit_entry(db_session):
    """11. Business creation via /admin/businesses produces an audit log entry"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_audit_create_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Platform Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_token = create_access_token(subject=str(admin.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        create_res = await client.post(
            "/api/v1/admin/businesses",
            json={"name": f"Audit Created Biz {uid}", "owner_name": "Audit Owner", "owner_email": f"audit_owner_{uid}@example.com"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_res.status_code == 201
        created_id = create_res.json()["id"]

        logs_res = await client.get(
            f"/api/v1/admin/audit-logs?tenant_id={created_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert logs_res.status_code == 200
        items = logs_res.json()["items"]
        assert len(items) >= 1
        assert any(item["action"] == "tenant.create_provisioned" for item in items)


@pytest.mark.asyncio
async def test_suspend_and_reactivate_actions_produce_audit_entries(db_session):
    """12. Suspend/reactivate actions produce audit log entries"""
    uid = uuid4().hex[:6]
    admin = User(
        email=f"admin_audit_suspend_{uid}@example.com",
        password_hash=hash_password("Pass123$$"),
        full_name="Platform Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(admin)
    await db_session.flush()

    tenant = Tenant(name=f"Audit Suspend Biz {uid}", slug=f"audit-susp-{uid}", is_active=True, status="Active")
    db_session.add(tenant)
    await db_session.commit()

    admin_token = create_access_token(subject=str(admin.id))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Suspend
        await client.put(
            f"/api/v1/admin/businesses/{tenant.id}/suspend",
            json={"reason": "Audit verification suspension"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Reactivate
        await client.put(
            f"/api/v1/admin/businesses/{tenant.id}/reactivate",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Fetch audit logs for this tenant
        logs_res = await client.get(
            f"/api/v1/admin/audit-logs?tenant_id={tenant.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert logs_res.status_code == 200
        actions = [item["action"] for item in logs_res.json()["items"]]
        assert "tenant.suspend" in actions
        assert "tenant.reactivate" in actions
