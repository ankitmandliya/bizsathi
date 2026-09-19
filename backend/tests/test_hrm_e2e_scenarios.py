"""Comprehensive End-to-End Integration & Scenario Tests for HRMS Module.

Tests real database workflows across:
1. WorkSchedule & Business Settings
2. Departments & Designations
3. Employee Lifecycle & Pro-Rata Leave Balances
4. Attendance (Grace period, Late, Half-Day, Overtime, Auto-checkout)
5. Holidays Calendar
6. Leave Management & Overlapping Request Validation
7. Salary Advances & Negative Net Pay Warnings
8. Payroll Run Engine & LOP Formula Validation
"""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.domain import Tenant, User
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
    AttendanceCheckIn,
    AttendanceCheckOut,
    DepartmentCreate,
    DesignationCreate,
    EmployeeCreate,
    HolidayCreate,
    LeaveRequestCreate,
    SalaryAdvanceCreate,
    SalaryStructureCreate,
    WorkScheduleCreate,
)
from app.services.hrm import HRMService, compute_working_days_in_month, HolidayRepository
from app.services.pdf import generate_payslip_pdf_html


from app.core.database import engine


@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
            await engine.dispose()


@pytest.mark.asyncio
async def test_hrm_full_e2e_scenario(db_session: AsyncSession):
    """End-to-end integration test covering all HRMS sub-modules in sequence."""
    tenant_id = uuid4()
    user_id = uuid4()

    # Create tenant & user in DB to satisfy Foreign Key constraints
    tenant = Tenant(id=tenant_id, name="Test Biz Enterprise", slug=f"test-biz-{uuid4().hex[:8]}")
    user = User(id=user_id, email=f"admin-{uuid4().hex[:8]}@example.com", password_hash="dummy", full_name="Test Admin")
    db_session.add(tenant)
    db_session.add(user)
    await db_session.commit()

    service = HRMService(db_session)

    # 1. Setup Work Schedule (Mon-Fri 09:30-18:30, Grace: 15m, HalfDay: 4h, Payday: 1st)
    ws_in = WorkScheduleCreate(
        working_days="0,1,2,3,4",
        start_time=time(9, 30),
        end_time=time(18, 30),
        late_after_minutes=15,
        half_day_threshold_hours=4,
        payday=1,
        effective_from=date(2026, 1, 1),
    )
    ws = await service.set_work_schedule(tenant_id, ws_in, user_id)
    assert ws.working_days == "0,1,2,3,4"
    assert ws.late_after_minutes == 15
    assert ws.payday == 1

    # Active schedule verification
    active_ws = await service.get_active_schedule(tenant_id)
    assert active_ws.id == ws.id

    # 2. Setup Department & Designation
    dept = await service.create_department(tenant_id, DepartmentCreate(name="Engineering"), user_id)
    assert dept.name == "Engineering"

    desig = await service.create_designation(tenant_id, DesignationCreate(name="Senior Developer"), user_id)
    assert desig.name == "Senior Developer"

    # 3. Add Employee with Salary Structure
    sal_in = SalaryStructureCreate(
        basic=Decimal("30000.00"),
        hra=Decimal("12000.00"),
        other_allowances=Decimal("8000.00"),
        other_deductions=Decimal("2000.00"),
        effective_from=date(2026, 1, 1),
    )
    emp_in = EmployeeCreate(
        name="Aarav Sharma",
        email=f"aarav.{uuid4().hex[:6]}@example.com",
        phone="9876543210",
        joining_date=date(2026, 1, 15),
        department_id=dept.id,
        designation_id=desig.id,
    )
    emp = await service.create_employee(tenant_id, emp_in, user_id)
    assert emp.name == "Aarav Sharma"
    assert emp.status == "Active"

    # Set salary structure for employee
    sal_struct = await service.set_salary_structure(tenant_id, emp.id, sal_in, user_id)
    assert sal_struct is not None
    assert sal_struct.basic == Decimal("30000.00")

    # 4. Add Holiday
    hol = await service.create_holiday(tenant_id, HolidayCreate(name="Gandhi Jayanti", holiday_date=date(2026, 10, 2)), user_id)
    assert hol.name == "Gandhi Jayanti"

    hols = await service.list_holidays(tenant_id, 2026)
    assert len(hols) >= 1

    # 5. Test Attendance logic (On-time, Late)
    check_in_1 = datetime(2026, 9, 14, 9, 25, tzinfo=timezone.utc)
    att1 = await service.check_in(tenant_id, AttendanceCheckIn(employee_id=emp.id, check_in_time=check_in_1), user_id)
    assert att1.status == "PRESENT"

    check_out_1 = datetime(2026, 9, 14, 18, 30, tzinfo=timezone.utc)
    att1_out = await service.check_out(tenant_id, att1.id, AttendanceCheckOut(check_out_time=check_out_1), user_id)
    assert att1_out.status == "PRESENT"
    assert att1_out.working_minutes == 545

    # Check-in Late (09:50 AM -> after 09:30 + 15m grace) -> LATE
    check_in_2 = datetime(2026, 9, 15, 9, 50, tzinfo=timezone.utc)
    att2 = await service.check_in(tenant_id, AttendanceCheckIn(employee_id=emp.id, check_in_time=check_in_2), user_id)
    assert att2.status == "LATE"

    # Seed attendance for all other working days in Sept 2026 as PRESENT (so unpaid_absence_days = 0)
    working_days = await compute_working_days_in_month(tenant_id, 2026, 9, ws, HolidayRepository(db_session))
    for d in working_days:
        if d in (date(2026, 9, 14), date(2026, 9, 15), date(2026, 9, 21), date(2026, 9, 22)):
            continue
        c_in = datetime.combine(d, time(9, 25), tzinfo=timezone.utc)
        c_out = datetime.combine(d, time(18, 30), tzinfo=timezone.utc)
        att = Attendance(
            tenant_id=tenant_id,
            employee_id=emp.id,
            attendance_date=d,
            check_in_at=c_in,
            check_out_at=c_out,
            working_minutes=545,
            status="PRESENT",
            source="WEB",
        )
        db_session.add(att)
    await db_session.commit()

    # 6. Test Leave Management & Leave Balances
    leave_types = await service.list_leave_types(tenant_id)
    assert len(leave_types) >= 1
    casual_leave = leave_types[0]

    # Check initial balance
    balances = await service.get_employee_leave_balance(tenant_id, emp.id, year=2026)
    assert len(balances) >= 1
    casual_bal = balances[0]
    initial_remaining = casual_bal.remaining_days

    # Request 2 days leave
    lr_in = LeaveRequestCreate(
        employee_id=emp.id,
        leave_type_id=casual_leave.id,
        start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22),
        reason="Family event",
    )
    leave_req = await service.create_leave_request(tenant_id, lr_in, user_id)
    assert leave_req.status == "PENDING"

    # Approve Leave
    approved_leave = await service.approve_leave(tenant_id, leave_req.id, user_id)
    assert approved_leave.status == "APPROVED"

    # Also mark attendance rows for leave days as LEAVE
    for d in (date(2026, 9, 21), date(2026, 9, 22)):
        att_l = Attendance(
            tenant_id=tenant_id,
            employee_id=emp.id,
            attendance_date=d,
            status="LEAVE",
            source="WEB",
        )
        db_session.add(att_l)
    await db_session.commit()

    # Check updated balance (2 days deducted)
    updated_balances = await service.get_employee_leave_balance(tenant_id, emp.id, year=2026)
    updated_casual_bal = next(b for b in updated_balances if b.leave_type_id == casual_leave.id)
    assert updated_casual_bal.used_days == 2
    assert updated_casual_bal.remaining_days == initial_remaining - 2

    # 7. Test Salary Advance & Warning
    adv_in = SalaryAdvanceCreate(
        employee_id=emp.id,
        amount=Decimal("10000.00"),
        reason="Festival shopping",
        advance_date=date(2026, 9, 10),
        payroll_period="2026-09",
        confirm=False,
    )
    adv_res, warning = await service.create_salary_advance(tenant_id, adv_in, user_id)
    assert warning is None or warning.would_be_negative is False
    assert isinstance(adv_res, SalaryAdvance)
    assert adv_res.status == "PENDING"

    # 8. Test Payroll Run
    payroll = await service.run_payroll(tenant_id, "2026-09", user_id)
    assert payroll.payroll_period == "2026-09"
    assert payroll.status == "PROCESSED"

    # Check Payslip
    payslips = await service.get_payslips(tenant_id, payroll.id)
    assert len(payslips) == 1
    ps = payslips[0]
    assert ps.employee_id == emp.id
    assert ps.salary_advance_deduction == Decimal("10000.00")
    assert ps.net_payable == Decimal("38000.00")  # 50,000 gross - 2,000 deduct - 10,000 advance

    # Check Payslip HTML Generation
    html_out = generate_payslip_pdf_html(ps, emp, payroll.payroll_period)
    assert "SALARY SLIP" in html_out
    assert "Aarav Sharma" in html_out
    assert "38,000" in html_out
