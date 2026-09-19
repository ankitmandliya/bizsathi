from datetime import date, datetime, time, timezone, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

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
    AttendanceUpdate,
    EmployeeCreate,
    LeaveRequestCreate,
    PayrollRunRequest,
    SalaryAdvanceCreate,
    SalaryStructureCreate,
    WorkScheduleCreate,
)
from app.services.hrm import HRMService


def build_mock_db():
    mock_db = AsyncMock()
    stored_objects = []

    def mock_add(obj):
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    mock_db.add = MagicMock(side_effect=mock_add)
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db._stored = stored_objects
    return mock_db


@pytest.mark.asyncio
async def test_work_schedule_creation():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    schedule_in = WorkScheduleCreate(
        working_days="0,1,2,3,4",
        start_time=time(9, 0),
        end_time=time(18, 0),
        late_after_minutes=15,
        half_day_threshold_hours=4,
        effective_from=date(2026, 1, 1),
    )

    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_active = AsyncMock(return_value=None)
    service.ws_repo = mock_ws_repo

    ws = await service.set_work_schedule(tenant_id, schedule_in, user_id)
    assert ws.late_after_minutes == 15
    assert len(db._stored) >= 1


@pytest.mark.asyncio
async def test_salary_advance_warning_on_negative_net():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = Employee(id=employee_id, tenant_id=tenant_id, name="Test Emp", status="Active")

    salary_struct = SalaryStructure(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        basic=Decimal("20000.00"),
        hra=Decimal("5000.00"),
        other_allowances=Decimal("5000.00"),
        other_deductions=Decimal("0.00"),
        effective_from=date(2026, 1, 1),
    )

    # Mock repository responses
    mock_emp_repo = AsyncMock()
    mock_emp_repo.get_by_id = AsyncMock(return_value=emp)
    mock_struct_repo = AsyncMock()
    mock_struct_repo.get_current = AsyncMock(return_value=salary_struct)
    mock_advance_repo = AsyncMock()
    mock_advance_repo.sum_pending_for_period = AsyncMock(return_value=25000.0)
    mock_advance_repo.get_by_id = AsyncMock(
        side_effect=lambda t, adv_id: SalaryAdvance(id=adv_id, tenant_id=t, amount=10000.0, status="PENDING")
    )

    service.emp_repo = mock_emp_repo
    service.salary_repo = mock_struct_repo
    service.adv_repo = mock_advance_repo

    # Request advance of 10000 -> Existing 25000 + 10000 = 35000 > 30000 gross
    advance_in = SalaryAdvanceCreate(
        employee_id=employee_id,
        amount=Decimal("10000.00"),
        reason="Medical emergency",
        advance_date=date(2026, 9, 15),
        payroll_period="2026-09",
        confirm=False,
    )

    advance_or_warn, warning = await service.create_salary_advance(tenant_id, advance_in, user_id)
    assert warning is not None
    assert warning.would_be_negative is True

    # Now request with confirm=True
    advance_in.confirm = True
    adv_result, warning_result = await service.create_salary_advance(tenant_id, advance_in, user_id)
    assert isinstance(adv_result, SalaryAdvance)
    assert adv_result.amount == Decimal("10000.00")


@pytest.mark.asyncio
async def test_attendance_status_late_and_working_minutes():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    schedule = WorkSchedule(
        id=uuid4(),
        tenant_id=tenant_id,
        working_days="0,1,2,3,4",
        start_time=time(9, 0),
        end_time=time(18, 0),
        late_after_minutes=15,
        half_day_threshold_hours=4,
        effective_from=date(2026, 1, 1),
    )

    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_active = AsyncMock(return_value=schedule)
    mock_emp_repo = AsyncMock()
    mock_emp_repo.get_by_id = AsyncMock(return_value=Employee(id=employee_id, tenant_id=tenant_id, status="Active"))
    mock_att_repo = AsyncMock()
    mock_att_repo.get_by_employee_date = AsyncMock(return_value=None)
    mock_holiday_repo = AsyncMock()
    mock_holiday_repo.is_holiday = AsyncMock(return_value=False)

    service.ws_repo = mock_ws_repo
    service.emp_repo = mock_emp_repo
    service.att_repo = mock_att_repo
    service.holiday_repo = mock_holiday_repo

    # Check in — use a fixed Monday (Sep 14, 2026) to avoid weekend failures
    check_in_time = datetime(2026, 9, 14, 9, 25, tzinfo=timezone.utc)
    check_in_payload = AttendanceCheckIn(employee_id=employee_id, check_in_time=check_in_time)

    att = await service.check_in(tenant_id, check_in_payload, user_id)

    # Set check_in_at to 9:30 AM (after 9:00 + 15m grace) — use fixed date
    base_today = datetime(2026, 9, 14, tzinfo=timezone.utc)
    att.check_in_at = base_today.replace(hour=9, minute=30, second=0, microsecond=0)
    att.check_out_at = None
    mock_att_repo.get_by_id = AsyncMock(return_value=att)

    # Calculate status using service helper directly to verify computation logic
    status_val, working_mins = service._compute_attendance_status(
        att.check_in_at,
        att.check_in_at + timedelta(hours=5),
        schedule
    )
    assert status_val == "LATE"
    assert working_mins == 300


@pytest.mark.asyncio
async def test_payroll_run_calculation():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    employee_id = uuid4()

    emp = Employee(
        id=employee_id,
        tenant_id=tenant_id,
        name="Rajesh Kumar",
        status="Active",
    )

    sal_struct = SalaryStructure(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        basic=Decimal("25000.00"),
        hra=Decimal("10000.00"),
        other_allowances=Decimal("5000.00"),
        other_deductions=Decimal("2000.00"),
        effective_from=date(2026, 1, 1),
    )

    ws = WorkSchedule(
        id=uuid4(),
        tenant_id=tenant_id,
        working_days="0,1,2,3,4",
        start_time=time(9, 0),
        end_time=time(18, 0),
        late_after_minutes=15,
        half_day_threshold_hours=4,
        effective_from=date(2026, 1, 1),
    )

    advance = SalaryAdvance(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        amount=Decimal("5000.00"),
        status="APPROVED",
    )

    # Mock repos
    mock_payroll_repo = AsyncMock()
    mock_payroll_repo.get_by_period = AsyncMock(return_value=None)
    mock_emp_repo = AsyncMock()
    mock_emp_repo.list_active = AsyncMock(return_value=[emp])
    mock_struct_repo = AsyncMock()
    mock_struct_repo.get_current = AsyncMock(return_value=sal_struct)
    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_active = AsyncMock(return_value=ws)
    mock_holiday_repo = AsyncMock()
    mock_holiday_repo.list_for_year = AsyncMock(return_value=[])
    mock_holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    mock_att_repo = AsyncMock()
    mock_att_repo.get_month_statuses = AsyncMock(return_value=[])
    mock_leave_repo = AsyncMock()
    mock_leave_repo.get_approved_for_date = AsyncMock(return_value=None)
    mock_adv_repo = AsyncMock()
    mock_adv_repo.get_pending_for_period = AsyncMock(return_value=[advance])
    mock_payslip_repo = AsyncMock()

    service.payroll_repo = mock_payroll_repo
    service.emp_repo = mock_emp_repo
    service.salary_repo = mock_struct_repo
    service.ws_repo = mock_ws_repo
    service.holiday_repo = mock_holiday_repo
    service.att_repo = mock_att_repo
    service.lr_repo = mock_leave_repo
    service.adv_repo = mock_adv_repo
    service.payslip_repo = mock_payslip_repo

    payroll_res = await service.run_payroll(tenant_id, "2026-09", user_id)

    assert payroll_res.payroll_period == "2026-09"
    assert payroll_res.status == "PROCESSED"
    # Verify that advance was marked ADJUSTED
    assert advance.status == "ADJUSTED"


@pytest.mark.asyncio
async def test_leave_balance_calculation():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual_type = LeaveType(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Casual Leave",
        is_paid=True,
        default_annual_days=12,
    )

    req1 = LeaveRequest(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        leave_type_id=casual_type.id,
        start_date=date(2026, 3, 10),
        end_date=date(2026, 3, 12),  # 3 days
        status="APPROVED",
    )

    mock_lt_repo = AsyncMock()
    mock_lt_repo.list_for_tenant = AsyncMock(return_value=[casual_type])
    mock_lr_repo = AsyncMock()
    mock_lr_repo.list_requests = AsyncMock(return_value=([req1], 1))

    service.lt_repo = mock_lt_repo
    service.lr_repo = mock_lr_repo

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    assert len(balances) == 1
    b = balances[0]
    assert b.default_annual_days == 12
    assert b.used_days == 3
    assert b.remaining_days == 9


@pytest.mark.asyncio
async def test_default_work_schedule_seeding():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_active = AsyncMock(return_value=None)
    service.ws_repo = mock_ws_repo

    ws = await service.get_active_schedule(tenant_id)
    assert ws.payday == 1
    assert ws.working_days == "0,1,2,3,4"

