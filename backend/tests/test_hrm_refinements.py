import pytest
from uuid import uuid4
from httpx import ASGITransport, AsyncClient

from app.core.database import AsyncSessionLocal, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.domain import Role, Tenant, TenantMember, User
from app.models.hrm import Department, Designation, Employee, Payslip, Payroll


@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
            await engine.dispose()


@pytest.mark.asyncio
async def test_employee_self_service_scoping(db_session):
    """Test that a plain employee can only view their own data and cannot access other employees' profiles/salary."""
    tenant_id = uuid4()
    t = Tenant(id=tenant_id, name="Scoping Test Tenant", slug=f"scoping-test-{uuid4().hex[:6]}")
    db_session.add(t)

    user_a = User(
        id=uuid4(),
        email=f"emp_a_{uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Pass123!"),
        full_name="Employee A",
        is_active=True,
    )
    user_b = User(
        id=uuid4(),
        email=f"emp_b_{uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Pass123!"),
        full_name="Employee B",
        is_active=True,
    )
    db_session.add_all([user_a, user_b])
    await db_session.flush()

    tm_a = TenantMember(tenant_id=tenant_id, user_id=user_a.id, is_owner=False, status="active")
    tm_b = TenantMember(tenant_id=tenant_id, user_id=user_b.id, is_owner=False, status="active")
    db_session.add_all([tm_a, tm_b])

    dept = Department(tenant_id=tenant_id, name="Engineering")
    db_session.add(dept)
    await db_session.flush()

    desig = Designation(tenant_id=tenant_id, name="Dev", department_id=dept.id)
    db_session.add(desig)
    await db_session.flush()

    emp_a = Employee(
        tenant_id=tenant_id,
        user_id=user_a.id,
        name="Employee A",
        email=user_a.email,
        department_id=dept.id,
        designation_id=desig.id,
        status="Active",
    )
    emp_b = Employee(
        tenant_id=tenant_id,
        user_id=user_b.id,
        name="Employee B",
        email=user_b.email,
        department_id=dept.id,
        designation_id=desig.id,
        status="Active",
    )
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    user_a_id = user_a.id
    emp_a_id = emp_a.id
    emp_b_id = emp_b.id

    token_a = create_access_token(subject=str(user_a_id))
    headers_a = {"Authorization": f"Bearer {token_a}", "X-Tenant-ID": str(tenant_id)}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. GET /employees for User A should return only emp_a (total=1)
        res = await ac.get("/api/v1/hrm/employees", headers=headers_a)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == str(emp_a_id)

        # 2. GET /employees/{emp_b_id} for User A should return 403 Forbidden
        res = await ac.get(f"/api/v1/hrm/employees/{emp_b_id}", headers=headers_a)
        assert res.status_code == 403

        # 3. GET /employees/{emp_a_id} for User A should return 200 OK
        res = await ac.get(f"/api/v1/hrm/employees/{emp_a_id}", headers=headers_a)
        assert res.status_code == 200
        assert res.json()["name"] == "Employee A"

        # 4. GET /employees/{emp_b_id}/salary-structure for User A should return 403
        res = await ac.get(f"/api/v1/hrm/employees/{emp_b_id}/salary-structure", headers=headers_a)
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_hr_permission_assignment_and_pdf_download(db_session):
    """Test setting up login with HR role and downloading payslip PDF via token query param."""
    tenant_id = uuid4()
    t = Tenant(id=tenant_id, name="HR Role Test Tenant", slug=f"hr-role-{uuid4().hex[:6]}")
    db_session.add(t)

    admin_user = User(
        id=uuid4(),
        email=f"admin_{uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Pass123!"),
        full_name="Tenant Admin",
        is_active=True,
    )
    db_session.add(admin_user)
    await db_session.flush()

    tm_admin = TenantMember(tenant_id=tenant_id, user_id=admin_user.id, is_owner=True, status="active")
    db_session.add(tm_admin)

    dept = Department(tenant_id=tenant_id, name="Accounts")
    db_session.add(dept)
    await db_session.flush()

    desig = Designation(tenant_id=tenant_id, name="HR Lead", department_id=dept.id)
    db_session.add(desig)
    await db_session.flush()

    emp_hr = Employee(
        tenant_id=tenant_id,
        name="HR Manager User",
        email=f"hr_{uuid4().hex[:6]}@example.com",
        department_id=dept.id,
        designation_id=desig.id,
        status="Active",
    )
    db_session.add(emp_hr)
    await db_session.commit()

    admin_user_id = admin_user.id
    emp_hr_id = emp_hr.id
    emp_hr_email = emp_hr.email

    admin_token = create_access_token(subject=str(admin_user_id))
    admin_headers = {"Authorization": f"Bearer {admin_token}", "X-Tenant-ID": str(tenant_id)}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Setup login with HR role
        res = await ac.post(
            f"/api/v1/hrm/employees/{emp_hr_id}/setup-login",
            headers=admin_headers,
            json={"username": emp_hr_email, "password": "HRPassword123!", "role": "HR"},
        )
        assert res.status_code == 200

        # Login as HR Manager
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": emp_hr_email, "password": "HRPassword123!"},
        )
        assert login_res.status_code == 200
        hr_token = login_res.json()["access_token"]
        hr_headers = {"Authorization": f"Bearer {hr_token}", "X-Tenant-ID": str(tenant_id)}

        # Verify HR Manager can view all employees
        emp_list_res = await ac.get("/api/v1/hrm/employees", headers=hr_headers)
        assert emp_list_res.status_code == 200

    # 2. Create Payroll & Payslip to test PDF download
    payroll = Payroll(tenant_id=tenant_id, payroll_period="2026-08", status="PROCESSED", processed_by_id=admin_user_id)
    db_session.add(payroll)
    await db_session.flush()

    payslip = Payslip(
        tenant_id=tenant_id,
        payroll_id=payroll.id,
        employee_id=emp_hr_id,
        gross_salary=40000.0,
        basic=30000.0,
        hra=10000.0,
        other_allowances=0.0,
        working_days_in_period=22,
        unpaid_absence_days=0,
        unpaid_absence_deduction=0.0,
        salary_advance_deduction=0.0,
        other_deductions=0.0,
        net_payable=40000.0,
    )
    db_session.add(payslip)
    await db_session.commit()

    payslip_id = payslip.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Test PDF download using token query parameter (simulating window.open)
        pdf_res = await ac.get(f"/api/v1/hrm/payslips/{payslip_id}/pdf?token={hr_token}", headers={"X-Tenant-ID": str(tenant_id)})
        assert pdf_res.status_code == 200, f"Expected 200, got {pdf_res.status_code}: {pdf_res.text}"
        assert "SALARY SLIP" in pdf_res.text
        assert "HR Manager User" in pdf_res.text


