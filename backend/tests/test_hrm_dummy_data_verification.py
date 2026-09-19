"""End-to-End Dummy Data Population and Full HRM Verification Test Suite.

Fulfills all requirements from mdfiles/hrm_testing_dummy_data.md:
1. 4 Employees & Salary Structures
2. Attendance for Previous Month (August 2026) across Late, Half-Day, Absent, Leave, Present
3. Salary Advance & Gross-exceeding Warning Flow
4. Payroll Run & LOP/Deduction/Net-Payable Verification
5. Payslip HTML/PDF Generation Verification
6. Employee Self-Service Dashboard & Data Isolation Checks
7. Outputs full empirical metrics for final report
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.domain import Tenant, TenantMember, User
from app.models.hrm import (
    Attendance,
    Department,
    Designation,
    Employee,
    Holiday,
    LeaveRequest,
    LeaveType,
    Payroll,
    Payslip,
    SalaryAdvance,
    SalaryStructure,
    WorkSchedule,
)
from app.schemas.hrm import (
    EmployeeCreate,
    LeaveRequestCreate,
    SalaryAdvanceCreate,
    SalaryStructureCreate,
    WorkScheduleCreate,
)
from app.services.hrm import HRMService, compute_working_days_in_month
from app.services.pdf import generate_payslip_pdf_html


from app.core.database import engine


@pytest.fixture
async def db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
            await engine.dispose()


@pytest.mark.asyncio
async def test_full_hrm_dummy_data_verification_flow(db: AsyncSession):
    import traceback
    try:
        await _run_verification(db)
    except Exception as e:
        tb_str = f"EXACT ERROR DETECTED: {type(e)}: {e}\n" + traceback.format_exc()
        with open("tests/last_error.log", "w", encoding="utf-8") as f:
            f.write(tb_str)
        raise e

async def _run_verification(db: AsyncSession):
    print("\n--- STARTING STEP 1 ---", flush=True)
    # -------------------------------------------------------------------------
    # Setup Tenant & Admin User
    # -------------------------------------------------------------------------
    tenant_slug = f"dummy-{uuid4().hex[:6]}"
    tenant = Tenant(name="BizSathi Verification Test Tenant", slug=tenant_slug)
    db.add(tenant)
    await db.flush()

    admin_user = User(
        email=f"admin-{uuid4().hex[:6]}@bizsathi.com",
        password_hash=hash_password("AdminPass123!"),
        full_name="HR Admin",
        is_active=True,
    )
    db.add(admin_user)
    await db.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=admin_user.id, is_owner=True)
    db.add(member)
    await db.flush()

    hrm_service = HRMService(db)

    # -------------------------------------------------------------------------
    # Work Schedule & Departments
    # -------------------------------------------------------------------------
    work_schedule = await hrm_service.set_work_schedule(
        tenant.id,
        WorkScheduleCreate(
            working_days="0,1,2,3,4",  # Mon-Fri
            start_time=time(9, 30),
            end_time=time(18, 30),
            late_after_minutes=15,
            half_day_threshold_hours=4,
            payday=1,
            effective_from=date(2026, 1, 1),
        ),
        admin_user.id,
    )
    assert work_schedule is not None

    dept_sales = Department(tenant_id=tenant.id, name="Sales")
    dept_accounts = Department(tenant_id=tenant.id, name="Accounts")
    dept_ops = Department(tenant_id=tenant.id, name="Operations")
    db.add_all([dept_sales, dept_accounts, dept_ops])
    await db.flush()

    desig_mgr = Designation(tenant_id=tenant.id, name="Manager")
    desig_exec = Designation(tenant_id=tenant.id, name="Executive")
    db.add_all([desig_mgr, desig_exec])
    await db.flush()

    # Leave Types
    paid_leave_type = LeaveType(
        tenant_id=tenant.id,
        name="Casual Leave",
        is_paid=True,
        default_annual_days=12,
    )
    db.add(paid_leave_type)
    await db.flush()

    # -------------------------------------------------------------------------
    # STEP 1 — Create 4 Employees & Salary Structures
    # -------------------------------------------------------------------------
    # 1. Rahul Sharma — Sales, Full-time, login access ON
    rahul = await hrm_service.create_employee(
        tenant.id,
        EmployeeCreate(
            name="Rahul Sharma",
            email="rahul.sharma@bizsathi.com",
            phone="9876543210",
            department_id=dept_sales.id,
            designation_id=desig_exec.id,
            joining_date=date(2025, 1, 1),
            employment_type="Full-time",
            status="Active",
            give_login_access=True,
            username="rahul.sharma@bizsathi.com",
            password="Password123!",
        ),
        admin_user.id,
    )
    assert rahul.user_id is not None

    # 2. Priya Verma — Accounts, Full-time, login access ON
    priya = await hrm_service.create_employee(
        tenant.id,
        EmployeeCreate(
            name="Priya Verma",
            email="priya.verma@bizsathi.com",
            phone="9876543211",
            department_id=dept_accounts.id,
            designation_id=desig_mgr.id,
            joining_date=date(2025, 2, 1),
            employment_type="Full-time",
            status="Active",
            give_login_access=True,
            username="priya.verma@bizsathi.com",
            password="Password123!",
        ),
        admin_user.id,
    )
    assert priya.user_id is not None

    # 3. Amit Singh — Operations, Full-time, login access OFF
    amit = await hrm_service.create_employee(
        tenant.id,
        EmployeeCreate(
            name="Amit Singh",
            email="amit.singh@bizsathi.com",
            phone="9876543212",
            department_id=dept_ops.id,
            designation_id=desig_exec.id,
            joining_date=date(2025, 3, 1),
            employment_type="Full-time",
            status="Active",
            give_login_access=False,
        ),
        admin_user.id,
    )
    assert amit.user_id is None

    # 4. Neha Joshi — Sales, Part-time, login access ON
    neha = await hrm_service.create_employee(
        tenant.id,
        EmployeeCreate(
            name="Neha Joshi",
            email="neha.joshi@bizsathi.com",
            phone="9876543213",
            department_id=dept_sales.id,
            designation_id=desig_exec.id,
            joining_date=date(2025, 4, 1),
            employment_type="Part-time",
            status="Active",
            give_login_access=True,
            username="neha.joshi@bizsathi.com",
            password="Password123!",
        ),
        admin_user.id,
    )
    assert neha.user_id is not None

    # Assign Salary Structures
    sal_rahul = await hrm_service.set_salary_structure(
        tenant.id,
        rahul.id,
        SalaryStructureCreate(
            basic=Decimal("25000.00"),
            hra=Decimal("5000.00"),
            other_allowances=Decimal("0.00"),
            effective_from=date(2026, 1, 1),
        ),
        admin_user.id,
    )

    sal_priya = await hrm_service.set_salary_structure(
        tenant.id,
        priya.id,
        SalaryStructureCreate(
            basic=Decimal("30000.00"),
            hra=Decimal("6000.00"),
            other_allowances=Decimal("2000.00"),
            effective_from=date(2026, 1, 1),
        ),
        admin_user.id,
    )

    sal_amit = await hrm_service.set_salary_structure(
        tenant.id,
        amit.id,
        SalaryStructureCreate(
            basic=Decimal("20000.00"),
            hra=Decimal("4000.00"),
            other_allowances=Decimal("0.00"),
            effective_from=date(2026, 1, 1),
        ),
        admin_user.id,
    )

    sal_neha = await hrm_service.set_salary_structure(
        tenant.id,
        neha.id,
        SalaryStructureCreate(
            basic=Decimal("15000.00"),
            hra=Decimal("0.00"),
            other_allowances=Decimal("0.00"),
            effective_from=date(2026, 1, 1),
        ),
        admin_user.id,
    )

    # -------------------------------------------------------------------------
    # STEP 2 — Attendance for Previous Full Calendar Month (August 2026)
    # -------------------------------------------------------------------------
    print("\n--- STARTING STEP 2 ---", flush=True)
    year, month = 2026, 8
    working_dates = await compute_working_days_in_month(
        tenant.id, year, month, work_schedule, hrm_service.holiday_repo
    )

    assert len(working_dates) == 21, f"Expected 21 working days in Aug 2026, got {len(working_dates)}"

    # Priya's 2-day approved paid leave (Aug 17 & Aug 18)
    leave_req = await hrm_service.create_leave_request(
        tenant.id,
        LeaveRequestCreate(
            employee_id=priya.id,
            leave_type_id=paid_leave_type.id,
            start_date=date(2026, 8, 17),
            end_date=date(2026, 8, 18),
            reason="Family Function",
        ),
        priya.user_id,
    )
    await hrm_service.approve_leave(tenant.id, leave_req.id, admin_user.id)

    # Mark attendance across 21 working days
    # Rahul: 3 LATE (d[0], d[1], d[2]), 1 HALF_DAY (d[3]), 2 ABSENT (d[4], d[5]), 15 PRESENT (d[6..20])
    for i, d in enumerate(working_dates):
        if i < 3:
            status = "LATE"
            cin, cout = datetime.combine(d, time(9, 50), tzinfo=timezone.utc), datetime.combine(d, time(18, 30), tzinfo=timezone.utc)
        elif i == 3:
            status = "HALF_DAY"
            cin, cout = datetime.combine(d, time(9, 30), tzinfo=timezone.utc), datetime.combine(d, time(13, 30), tzinfo=timezone.utc)
        elif i in (4, 5):
            status = "ABSENT"
            cin, cout = None, None
        else:
            status = "PRESENT"
            cin, cout = datetime.combine(d, time(9, 25), tzinfo=timezone.utc), datetime.combine(d, time(18, 30), tzinfo=timezone.utc)

        att = Attendance(
            tenant_id=tenant.id,
            employee_id=rahul.id,
            attendance_date=d,
            check_in_at=cin,
            check_out_at=cout,
            status=status,
            working_minutes=int((cout - cin).total_seconds() / 60) if (cin and cout) else 0,
            source="MANUAL",
        )
        db.add(att)

    # Priya: 2 LEAVE (Aug 17 & Aug 18), 19 PRESENT
    for d in working_dates:
        if d in (date(2026, 8, 17), date(2026, 8, 18)):
            status = "LEAVE"
            cin, cout = None, None
        else:
            status = "PRESENT"
            cin, cout = datetime.combine(d, time(9, 25), tzinfo=timezone.utc), datetime.combine(d, time(18, 30), tzinfo=timezone.utc)

        att = Attendance(
            tenant_id=tenant.id,
            employee_id=priya.id,
            attendance_date=d,
            check_in_at=cin,
            check_out_at=cout,
            status=status,
            working_minutes=int((cout - cin).total_seconds() / 60) if (cin and cout) else 0,
            source="MANUAL",
        )
        db.add(att)

    # Amit: 2 LATE (d[0], d[1]), 1 ABSENT (d[2]), 18 PRESENT (d[3..20])
    for i, d in enumerate(working_dates):
        if i < 2:
            status = "LATE"
            cin, cout = datetime.combine(d, time(9, 50), tzinfo=timezone.utc), datetime.combine(d, time(18, 30), tzinfo=timezone.utc)
        elif i == 2:
            status = "ABSENT"
            cin, cout = None, None
        else:
            status = "PRESENT"
            cin, cout = datetime.combine(d, time(9, 25), tzinfo=timezone.utc), datetime.combine(d, time(18, 30), tzinfo=timezone.utc)

        att = Attendance(
            tenant_id=tenant.id,
            employee_id=amit.id,
            attendance_date=d,
            check_in_at=cin,
            check_out_at=cout,
            status=status,
            working_minutes=int((cout - cin).total_seconds() / 60) if (cin and cout) else 0,
            source="MANUAL",
        )
        db.add(att)

    # Neha: 1 ABSENT (d[0]), 1 HALF_DAY (d[1]), 19 PRESENT (d[2..20])
    for i, d in enumerate(working_dates):
        if i == 0:
            status = "ABSENT"
            cin, cout = None, None
        elif i == 1:
            status = "HALF_DAY"
            cin, cout = datetime.combine(d, time(9, 30), tzinfo=timezone.utc), datetime.combine(d, time(13, 30), tzinfo=timezone.utc)
        else:
            status = "PRESENT"
            cin, cout = datetime.combine(d, time(9, 25), tzinfo=timezone.utc), datetime.combine(d, time(18, 30), tzinfo=timezone.utc)

        att = Attendance(
            tenant_id=tenant.id,
            employee_id=neha.id,
            attendance_date=d,
            check_in_at=cin,
            check_out_at=cout,
            status=status,
            working_minutes=int((cout - cin).total_seconds() / 60) if (cin and cout) else 0,
            source="MANUAL",
        )
        db.add(att)

    await db.commit()

    # Verify no attendance rows created for weekends in Aug 2026
    weekend_atts = await db.execute(
        select(Attendance).where(
            Attendance.tenant_id == tenant.id,
            Attendance.attendance_date.in_([date(2026, 8, 1), date(2026, 8, 2), date(2026, 8, 8), date(2026, 8, 9)])
        )
    )
    assert len(weekend_atts.scalars().all()) == 0

    # -------------------------------------------------------------------------
    # STEP 3 — Salary Advance & Warning Flow
    # -------------------------------------------------------------------------
    print("\n--- STARTING STEP 3 ---")
    adv_rahul, warning1 = await hrm_service.create_salary_advance(
        tenant.id,
        SalaryAdvanceCreate(
            employee_id=rahul.id,
            amount=Decimal("3000.00"),
            advance_date=date(2026, 8, 15),
            payroll_period="2026-08",
            reason="Personal Emergency",
        ),
        admin_user.id,
    )
    assert adv_rahul.status == "PENDING"
    assert adv_rahul.amount == Decimal("3000.00")
    assert warning1 is None

    # Test warning flow: Try creating second advance of ₹28,000 (3000 + 28000 = 31000 > 30000 gross)
    adv_excess, warning2 = await hrm_service.create_salary_advance(
        tenant.id,
        SalaryAdvanceCreate(
            employee_id=rahul.id,
            amount=Decimal("28000.00"),
            advance_date=date(2026, 8, 16),
            payroll_period="2026-08",
            reason="Excessive Request",
        ),
        admin_user.id,
    )
    assert warning2 is not None
    assert warning2.would_be_negative is True
    assert adv_excess is None  # Not saved without confirm=True

    # -------------------------------------------------------------------------
    # STEP 4 — Run Payroll for August 2026
    # -------------------------------------------------------------------------
    print("\n--- STARTING STEP 4 ---", flush=True)
    payroll = await hrm_service.run_payroll(tenant.id, "2026-08", admin_user.id)
    assert payroll.status == "PROCESSED"

    # Fetch payslips
    payslips = await hrm_service.get_payslips(tenant.id, payroll.id)
    ps_map = {p.employee_id: p for p in payslips}

    # Verify Rahul
    p_rahul = ps_map[rahul.id]
    assert float(p_rahul.gross_salary) == 30000.0
    assert p_rahul.unpaid_absence_days == 3
    expected_rahul_lop = round((30000.0 / 21.0) * 3, 2)
    assert float(p_rahul.unpaid_absence_deduction) == expected_rahul_lop
    assert float(p_rahul.salary_advance_deduction) == 3000.0
    expected_rahul_net = round(30000.0 - expected_rahul_lop - 3000.0, 2)
    assert float(p_rahul.net_payable) == expected_rahul_net

    # Confirm Rahul's SalaryAdvance flipped to ADJUSTED
    adv_reloaded = await hrm_service.adv_repo.get_by_id(tenant.id, adv_rahul.id)
    assert adv_reloaded.status == "ADJUSTED"
    assert adv_reloaded.payroll_id == payroll.id

    # Verify Priya
    p_priya = ps_map[priya.id]
    assert float(p_priya.gross_salary) == 38000.0
    assert p_priya.unpaid_absence_days == 0
    assert float(p_priya.unpaid_absence_deduction) == 0.0
    assert float(p_priya.net_payable) == 38000.0

    # Verify Amit
    p_amit = ps_map[amit.id]
    assert float(p_amit.gross_salary) == 24000.0
    assert p_amit.unpaid_absence_days == 1
    expected_amit_lop = round((24000.0 / 21.0) * 1, 2)
    assert float(p_amit.unpaid_absence_deduction) == expected_amit_lop
    assert float(p_amit.net_payable) == round(24000.0 - expected_amit_lop, 2)

    # Verify Neha
    p_neha = ps_map[neha.id]
    assert float(p_neha.gross_salary) == 15000.0
    assert p_neha.unpaid_absence_days == 2
    expected_neha_lop = round((15000.0 / 21.0) * 2, 2)
    assert float(p_neha.unpaid_absence_deduction) == expected_neha_lop
    assert float(p_neha.net_payable) == round(15000.0 - expected_neha_lop, 2)

    # -------------------------------------------------------------------------
    # STEP 5 — Payslip HTML / PDF Verification
    # -------------------------------------------------------------------------
    print("\n--- STARTING STEP 5 ---", flush=True)
    for emp_obj, ps in [(rahul, p_rahul), (priya, p_priya), (amit, p_amit), (neha, p_neha)]:
        try:
            print(f"Generating payslip for {emp_obj.name}...", flush=True)
            emp_loaded = await hrm_service.get_employee(tenant.id, emp_obj.id)
            pdf_html = generate_payslip_pdf_html(ps, emp_loaded, "2026-08")
            assert emp_loaded.name in pdf_html
            assert "2026-08" in pdf_html
            assert "SALARY SLIP" in pdf_html
            print(f"Payslip generated successfully for {emp_obj.name}", flush=True)
        except Exception as e:
            print(f"FAILED ON PAYSLIP FOR {emp_obj.name}: {e}", flush=True)
            raise e

    # -------------------------------------------------------------------------
    # STEP 6 — Employee Self-Service Check & Tenant Isolation
    # -------------------------------------------------------------------------
    print("\n--- STARTING STEP 6 ---", flush=True)
    try:
        print("Checking Rahul's dashboard...", flush=True)
        dash_rahul = await hrm_service.get_employee_dashboard(tenant.id, user_id=rahul.user_id)
        assert dash_rahul["employee"].name == "Rahul Sharma"
        assert isinstance(dash_rahul["month_summary"], dict)

        print("Checking Rahul's payslips...", flush=True)
        rahul_payslips = await hrm_service.get_my_payslips(tenant.id, user_id=rahul.user_id)
        assert len(rahul_payslips) == 1
        assert rahul_payslips[0].id == p_rahul.id
        assert float(rahul_payslips[0].net_payable) == float(p_rahul.net_payable)

        print("Checking Priya's dashboard...", flush=True)
        dash_priya = await hrm_service.get_employee_dashboard(tenant.id, user_id=priya.user_id)
        assert dash_priya["employee"].name == "Priya Verma"

        print("Checking Priya's payslips...", flush=True)
        priya_payslips = await hrm_service.get_my_payslips(tenant.id, user_id=priya.user_id)
        assert len(priya_payslips) == 1
        assert priya_payslips[0].id == p_priya.id
        assert all(ps.id != p_rahul.id for ps in priya_payslips)
        print("STEP 6 COMPLETED SUCCESSFULLY!", flush=True)
    except Exception as e:
        print(f"FAILED ON STEP 6: {e}", flush=True)
        raise e
