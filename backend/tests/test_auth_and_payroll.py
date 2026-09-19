import pytest
from uuid import uuid4
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.database import AsyncSessionLocal, engine
from app.core.security import create_access_token, hash_password
from app.models.domain import User, Tenant, TenantMember

@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
            await engine.dispose()

@pytest.mark.asyncio
async def test_change_password_flow(db_session):
    uid = uuid4().hex[:6]
    email = f"testchange_{uid}@example.com"
    user = User(
        email=email,
        password_hash=hash_password("OldPassword123!"),
        full_name="Test Password Change User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    tenant = Tenant(name=f"Tenant {uid}", slug=f"tenant-{uid}", is_active=True)
    db_session.add(tenant)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)
    await db_session.commit()

    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Incorrect current password should fail
        res_fail = await ac.post("/api/v1/auth/change-password", headers=headers, json={
            "current_password": "WrongPassword!",
            "new_password": "NewPassword123!",
        })
        assert res_fail.status_code == 400
        assert "incorrect" in res_fail.json()["detail"].lower()

        # 2. Correct current password should succeed
        res_ok = await ac.post("/api/v1/auth/change-password", headers=headers, json={
            "current_password": "OldPassword123!",
            "new_password": "NewPassword123!",
        })
        assert res_ok.status_code == 200
        assert res_ok.json()["message"] == "Password changed successfully"

        # 3. Verify login with new password
        res_login = await ac.post("/api/v1/auth/login", json={
            "email": email,
            "password": "NewPassword123!",
        })
        assert res_login.status_code == 200
        assert "access_token" in res_login.json()

@pytest.mark.asyncio
async def test_auto_employee_linking_for_profile_and_dashboard(db_session):
    """Test that a user without a pre-existing employee record auto-generates one when accessing profile or dashboard."""
    uid = uuid4().hex[:6]
    email = f"unlinkedadmin_{uid}@example.com"
    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        full_name="Unlinked Admin User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    tenant = Tenant(name=f"Unlinked Tenant {uid}", slug=f"unlinked-tenant-{uid}", is_active=True)
    db_session.add(tenant)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)
    await db_session.commit()

    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # GET /me/profile should auto-create employee profile without throwing 404
        res_prof = await ac.get("/api/v1/hrm/me/profile", headers=headers)
        assert res_prof.status_code == 200
        prof_data = res_prof.json()
        assert prof_data["name"] == "Unlinked Admin User"
        assert prof_data["email"] == email

        # GET /me/dashboard should succeed
        res_dash = await ac.get("/api/v1/hrm/me/dashboard", headers=headers)
        assert res_dash.status_code == 200
        dash_data = res_dash.json()
        assert dash_data["employee"]["name"] == "Unlinked Admin User"

@pytest.mark.asyncio
async def test_payroll_count_and_payslip_net_payable(db_session):
    """Test that list_payrolls returns non-zero payslip_count and payslips include net_payable."""
    from app.services.hrm import HRMService
    from app.models.hrm import WorkSchedule, SalaryStructure

    uid = uuid4().hex[:6]
    email = f"payrolluser_{uid}@example.com"
    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        full_name="Payroll Test User",
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.flush()

    tenant = Tenant(name=f"Payroll Tenant {uid}", slug=f"payroll-tenant-{uid}", is_active=True)
    db_session.add(tenant)
    await db_session.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, is_owner=True, status="active")
    db_session.add(member)
    await db_session.commit()

    service = HRMService(db_session)
    emp = await service._ensure_employee_for_user(tenant.id, user.id)

    from datetime import time, date
    # Add work schedule
    ws = WorkSchedule(
        tenant_id=tenant.id,
        working_days="0,1,2,3,4",
        start_time=time(9, 0),
        end_time=time(18, 0),
        effective_from=date(2026, 1, 1),
    )
    db_session.add(ws)

    emp.joining_date = date(2026, 1, 1)
    await db_session.commit()

    # Add salary structure
    sal = SalaryStructure(
        tenant_id=tenant.id,
        employee_id=emp.id,
        basic=25000,
        hra=5000,
        other_allowances=0,
        other_deductions=0,
        effective_from=date(2026, 1, 1),
    )
    db_session.add(sal)
    await db_session.commit()

    # Run payroll for 2026-08
    payroll = await service.run_payroll(tenant.id, "2026-08", user.id)
    assert payroll is not None

    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_pr = await ac.get("/api/v1/hrm/payroll", headers=headers)
        pr_data = res_pr.json()
        res_ps = await ac.get(f"/api/v1/hrm/payroll/{payroll.id}/payslips", headers=headers)
        ps_data = res_ps.json()
        assert len(pr_data.get("items", [])) >= 1, f"PR items empty: {pr_data}"
        run_item = pr_data["items"][0]
        assert run_item["payslip_count"] == 1, f"Payslip count mismatch: {run_item}"

        assert len(ps_data) == 1, f"PS data empty: {ps_data}"
        payslip_item = ps_data[0]
        assert "net_payable" in payslip_item, f"net_payable missing in {payslip_item}"
        assert payslip_item["gross_salary"] == 30000.0, f"gross_salary mismatch: {payslip_item}"

