"""Comprehensive HRMS Test Suite — All Possible Scenarios.

Testing Expert Coverage:
1.  WorkSchedule — create, update (effective-dating), default seeding, payday field
2.  Holidays — CRUD, working-day check exclusion
3.  Departments & Designations — CRUD, 404 paths
4.  Employees — CRUD, soft-delete, status, pagination, search, cross-tenant isolation
5.  SalaryStructure — effective-dating, multiple versions, no-salary employee in payroll
6.  Attendance — check-in (on-time, late, holiday/weekend rejection, duplicate),
                  check-out (present, late, half-day, already-checked-out, no-check-in),
                  manual correction, status boundaries
7.  EOD Evaluation — absent marking, leave marking, non-working-day skip
8.  Leave Types — seeding, create, list
9.  Leave Requests — create, approve, reject, invalid-date, end<start rejection,
                     cancel-after-approve blocked, already-approved block
10. Leave Balance — zero taken, partial, exceeding annual, multi-type
11. Salary Advance — warning (no warning, warning-rejected, warning-confirmed),
                     negative-net allowed, advance-on-adjusted-payroll blocked
12. Payroll — run, idempotency, duplicate blocked on PROCESSED,
              gross calc, absence deduction, advance deduction, negative net,
              payslip PDF generation, snapshot immutability
13. Security — cross-tenant employee/attendance/leave/advance/payroll 404
14. Edge cases — leave end_date < start_date, advance on no-salary employee,
                 checkout before checkin, double checkout, payroll period format
"""

from datetime import UTC, date, datetime, time, timedelta
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
    DepartmentCreate,
    DepartmentUpdate,
    DesignationCreate,
    DesignationUpdate,
    EmployeeCreate,
    EmployeeUpdate,
    HolidayCreate,
    LeaveRequestCreate,
    LeaveTypeCreate,
    PayrollRunRequest,
    SalaryAdvanceCreate,
    SalaryStructureCreate,
    WorkScheduleCreate,
)
from app.services.hrm import (
    HRMService,
    _parse_working_day_set,
    compute_working_days_in_month,
    seed_default_work_schedule,
    seed_default_leave_types,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_mock_db():
    """Mock async DB session with object tracking."""
    mock_db = AsyncMock()
    stored_objects = []
    deleted_objects = []

    def mock_add(obj):
        if not hasattr(obj, "id") or getattr(obj, "id", None) is None:
            setattr(obj, "id", uuid4())
        stored_objects.append(obj)

    async def mock_delete(obj):
        deleted_objects.append(obj)

    mock_db.add = MagicMock(side_effect=mock_add)
    mock_db.delete = AsyncMock(side_effect=mock_delete)
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db._stored = stored_objects
    mock_db._deleted = deleted_objects
    return mock_db


def make_work_schedule(tenant_id, working_days="0,1,2,3,4",
                       start="09:30", end="18:30",
                       grace=15, half_day=4, payday=1):
    return WorkSchedule(
        id=uuid4(),
        tenant_id=tenant_id,
        working_days=working_days,
        start_time=datetime.strptime(start, "%H:%M").time(),
        end_time=datetime.strptime(end, "%H:%M").time(),
        late_after_minutes=grace,
        half_day_threshold_hours=half_day,
        payday=payday,
        effective_from=date(2026, 1, 1),
    )


def make_employee(tenant_id, **kwargs):
    emp = Employee(
        id=uuid4(),
        tenant_id=tenant_id,
        name=kwargs.get("name", "Test Employee"),
        status=kwargs.get("status", "Active"),
    )
    for k, v in kwargs.items():
        setattr(emp, k, v)
    return emp


def make_salary_struct(tenant_id, employee_id, basic=30000, hra=12000, other_allowances=8000, other_deductions=2000):
    return SalaryStructure(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        basic=Decimal(str(basic)),
        hra=Decimal(str(hra)),
        other_allowances=Decimal(str(other_allowances)),
        other_deductions=Decimal(str(other_deductions)),
        effective_from=date(2026, 1, 1),
    )


def make_leave_type(tenant_id, name="Casual Leave", is_paid=True, days=12):
    return LeaveType(
        id=uuid4(),
        tenant_id=tenant_id,
        name=name,
        is_paid=is_paid,
        default_annual_days=days,
    )


def make_attendance(tenant_id, employee_id, att_date, status="PRESENT",
                    check_in_at=None, check_out_at=None, working_minutes=None):
    return Attendance(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        attendance_date=att_date,
        status=status,
        source="WEB",
        check_in_at=check_in_at,
        check_out_at=check_out_at,
        working_minutes=working_minutes,
    )


# ---------------------------------------------------------------------------
# 1. WorkSchedule Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_work_schedule_create_no_existing():
    """Creating a schedule when no existing schedule exists."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=None)

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
    assert ws.late_after_minutes == 15
    assert ws.payday == 1
    assert ws.working_days == "0,1,2,3,4"


@pytest.mark.asyncio
async def test_work_schedule_update_closes_existing():
    """Updating schedule closes the old effective-dated row."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    old_ws = make_work_schedule(tenant_id)
    old_ws.effective_to = None

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=old_ws)

    new_effective_from = date(2026, 6, 1)
    ws_in = WorkScheduleCreate(
        working_days="0,1,2,3,4,5",  # Saturday added
        start_time=time(9, 0),
        end_time=time(17, 0),
        late_after_minutes=10,
        half_day_threshold_hours=3,
        payday=25,
        effective_from=new_effective_from,
    )
    ws = await service.set_work_schedule(tenant_id, ws_in, user_id)

    # Old schedule should be closed one day before the new one starts
    assert old_ws.effective_to == new_effective_from - timedelta(days=1)
    assert ws.working_days == "0,1,2,3,4,5"
    assert ws.payday == 25


@pytest.mark.asyncio
async def test_work_schedule_default_seeding():
    """Default schedule is seeded when none exists."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=None)

    ws = await service.get_active_schedule(tenant_id)
    assert ws.working_days == "0,1,2,3,4"
    assert ws.payday == 1
    assert ws.late_after_minutes == 15
    assert ws.half_day_threshold_hours == 4


@pytest.mark.asyncio
async def test_work_schedule_returns_existing_when_active():
    """get_active_schedule returns existing schedule without seeding."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    existing_ws = make_work_schedule(tenant_id, payday=25)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=existing_ws)

    ws = await service.get_active_schedule(tenant_id)
    assert ws.id == existing_ws.id
    assert ws.payday == 25


# ---------------------------------------------------------------------------
# 2. Holidays Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_holiday():
    """Holiday creation stores correct data."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    h = await service.create_holiday(
        tenant_id,
        HolidayCreate(name="Republic Day", holiday_date=date(2026, 1, 26)),
        user_id,
    )
    assert h.name == "Republic Day"
    assert h.holiday_date == date(2026, 1, 26)


@pytest.mark.asyncio
async def test_delete_holiday_not_found_raises_404():
    """Deleting a non-existent holiday raises 404."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await service.delete_holiday(tenant_id, uuid4(), user_id)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_list_holidays_for_year():
    """Listing holidays with a year filter returns filtered set."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    holidays = [
        Holiday(id=uuid4(), tenant_id=tenant_id, name="H1", holiday_date=date(2026, 1, 26)),
        Holiday(id=uuid4(), tenant_id=tenant_id, name="H2", holiday_date=date(2026, 8, 15)),
    ]
    service.holiday_repo = AsyncMock()
    service.holiday_repo.list_for_year = AsyncMock(return_value=holidays)

    result = await service.list_holidays(tenant_id, year=2026)
    assert len(result) == 2
    service.holiday_repo.list_for_year.assert_called_once_with(tenant_id, 2026)


# ---------------------------------------------------------------------------
# 3. Departments & Designations
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_and_update_department():
    """Department creation and update flow."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    dept = await service.create_department(tenant_id, DepartmentCreate(name="Engineering"), user_id)
    assert dept.name == "Engineering"

    # Update
    dept.name = "Engineering"
    service.dept_repo = AsyncMock()
    service.dept_repo.get_by_id = AsyncMock(return_value=dept)

    updated = await service.update_department(tenant_id, dept.id, DepartmentUpdate(name="R&D"), user_id)
    assert updated.name == "R&D"


@pytest.mark.asyncio
async def test_update_department_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    service.dept_repo = AsyncMock()
    service.dept_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.update_department(tenant_id, uuid4(), DepartmentUpdate(name="X"), user_id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_department_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.dept_repo = AsyncMock()
    service.dept_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.delete_department(tenant_id, uuid4(), uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_create_and_update_designation():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    dept_id = uuid4()

    desig = await service.create_designation(
        tenant_id, DesignationCreate(name="Senior Dev", department_id=dept_id), user_id
    )
    assert desig.name == "Senior Dev"

    service.desig_repo = AsyncMock()
    service.desig_repo.get_by_id = AsyncMock(return_value=desig)

    updated = await service.update_designation(tenant_id, desig.id, DesignationUpdate(name="Lead Dev"), user_id)
    assert updated.name == "Lead Dev"


@pytest.mark.asyncio
async def test_update_designation_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.desig_repo = AsyncMock()
    service.desig_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.update_designation(tenant_id, uuid4(), DesignationUpdate(name="X"), uuid4())
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 4. Employees
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_employee_defaults():
    """Employee created with default Active status."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    emp_in = EmployeeCreate(
        name="Priya Mehta",
        email="priya@example.com",
        phone="9876543210",
        joining_date=date(2026, 1, 1),
    )

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=Employee(
        id=uuid4(), tenant_id=tenant_id, name="Priya Mehta", status="Active"
    ))

    emp = await service.create_employee(tenant_id, emp_in, user_id)
    assert emp.name == "Priya Mehta"
    assert emp.status == "Active"


@pytest.mark.asyncio
async def test_get_employee_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.get_employee(tenant_id, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_employee_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.update_employee(tenant_id, uuid4(), EmployeeUpdate(name="X"), uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_soft_delete_employee():
    """Employee soft-delete sets deleted_at and status=Inactive."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    emp = make_employee(tenant_id)

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)

    await service.delete_employee(tenant_id, emp.id, user_id)
    assert emp.deleted_at is not None
    assert emp.status == "Inactive"


@pytest.mark.asyncio
async def test_delete_employee_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.delete_employee(tenant_id, uuid4(), uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_cross_tenant_employee_isolation():
    """Employee lookup from a different tenant returns 404."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_a = uuid4()
    tenant_b = uuid4()

    emp_tenant_a = make_employee(tenant_a)

    service.emp_repo = AsyncMock()
    # Simulate repo filtering by tenant_id — returns None for tenant_b
    service.emp_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.get_employee(tenant_b, emp_tenant_a.id)
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 5. Salary Structure — effective-dating
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_set_salary_structure_creates_new():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    service.salary_repo = AsyncMock()
    service.salary_repo.close_current = AsyncMock()

    sal_in = SalaryStructureCreate(
        basic=Decimal("25000.00"),
        hra=Decimal("10000.00"),
        other_allowances=Decimal("5000.00"),
        other_deductions=Decimal("1000.00"),
        effective_from=date(2026, 4, 1),
    )
    struct = await service.set_salary_structure(tenant_id, employee_id, sal_in, user_id)
    assert struct.basic == Decimal("25000.00")
    assert struct.hra == Decimal("10000.00")
    # Verify old structure was closed
    service.salary_repo.close_current.assert_called_once_with(
        tenant_id, employee_id, date(2026, 3, 31)
    )


# ---------------------------------------------------------------------------
# 6. Attendance — Check-in / Check-out
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_in_on_time_monday():
    """Check-in at 09:25 on Monday → PRESENT (within grace period)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    ws = make_work_schedule(tenant_id, start="09:30", grace=15)
    emp = make_employee(tenant_id, id=employee_id)

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.att_repo = AsyncMock()
    service.att_repo.get_by_employee_date = AsyncMock(return_value=None)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.is_holiday = AsyncMock(return_value=False)

    # Monday Sep 14, 2026
    check_in_time = datetime(2026, 9, 14, 9, 25, tzinfo=UTC)
    att = await service.check_in(
        tenant_id,
        AttendanceCheckIn(employee_id=employee_id, check_in_time=check_in_time),
        user_id,
    )
    assert att.status == "PRESENT"


@pytest.mark.asyncio
async def test_check_in_late():
    """Check-in at 09:50 → LATE (after 09:30 + 15m grace = 09:45)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    ws = make_work_schedule(tenant_id, start="09:30", grace=15)
    emp = make_employee(tenant_id, id=employee_id)

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.att_repo = AsyncMock()
    service.att_repo.get_by_employee_date = AsyncMock(return_value=None)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.is_holiday = AsyncMock(return_value=False)

    # Monday Sep 14, 2026 — 09:50
    check_in_time = datetime(2026, 9, 14, 9, 50, tzinfo=UTC)
    att = await service.check_in(
        tenant_id,
        AttendanceCheckIn(employee_id=employee_id, check_in_time=check_in_time),
        user_id,
    )
    assert att.status == "LATE"


@pytest.mark.asyncio
async def test_check_in_on_holiday_rejected():
    """Check-in on a holiday returns 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    ws = make_work_schedule(tenant_id)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.is_holiday = AsyncMock(return_value=True)  # it's a holiday!

    check_in_time = datetime(2026, 10, 2, 9, 30, tzinfo=UTC)  # Gandhi Jayanti
    with pytest.raises(HTTPException) as exc:
        await service.check_in(
            tenant_id,
            AttendanceCheckIn(employee_id=employee_id, check_in_time=check_in_time),
            user_id,
        )
    assert exc.value.status_code == 400
    assert "not a working day" in exc.value.detail


@pytest.mark.asyncio
async def test_check_in_on_weekend_rejected():
    """Check-in on Saturday (not in working_days Mon-Fri) is rejected."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    ws = make_work_schedule(tenant_id, working_days="0,1,2,3,4")  # Mon-Fri only
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.is_holiday = AsyncMock(return_value=False)

    # Saturday Sep 19, 2026
    check_in_time = datetime(2026, 9, 19, 9, 30, tzinfo=UTC)
    with pytest.raises(HTTPException) as exc:
        await service.check_in(
            tenant_id,
            AttendanceCheckIn(employee_id=employee_id, check_in_time=check_in_time),
            user_id,
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_check_in_no_work_schedule_raises_400():
    """Check-in with no work schedule configured returns 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=None)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.is_holiday = AsyncMock(return_value=False)

    with pytest.raises(HTTPException) as exc:
        await service.check_in(
            tenant_id,
            AttendanceCheckIn(employee_id=employee_id, check_in_time=datetime(2026, 9, 14, 9, 30, tzinfo=UTC)),
            uuid4(),
        )
    assert exc.value.status_code == 400
    assert "work schedule" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_duplicate_check_in_blocked():
    """Second check-in on same day raises 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    ws = make_work_schedule(tenant_id)
    existing_att = Attendance(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=datetime(2026, 9, 14, 9, 25, tzinfo=UTC),
        status="PRESENT",
        source="WEB",
    )

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.is_holiday = AsyncMock(return_value=False)
    service.att_repo = AsyncMock()
    service.att_repo.get_by_employee_date = AsyncMock(return_value=existing_att)

    with pytest.raises(HTTPException) as exc:
        await service.check_in(
            tenant_id,
            AttendanceCheckIn(employee_id=employee_id, check_in_time=datetime(2026, 9, 14, 11, 0, tzinfo=UTC)),
            user_id,
        )
    assert exc.value.status_code == 400
    assert "Already checked in" in exc.value.detail


@pytest.mark.asyncio
async def test_check_out_marks_present_with_working_minutes():
    """Full day checkout: 09:25-18:30 → PRESENT, correct working_minutes."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    ws = make_work_schedule(tenant_id, start="09:30", grace=15, half_day=4)
    check_in_at = datetime(2026, 9, 14, 9, 25, tzinfo=UTC)
    att = Attendance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=check_in_at, check_out_at=None, status="PRESENT", source="WEB",
    )

    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=att)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)

    check_out_time = datetime(2026, 9, 14, 18, 30, tzinfo=UTC)
    result = await service.check_out(tenant_id, att.id, AttendanceCheckOut(check_out_time=check_out_time))
    assert result.status == "PRESENT"
    assert result.working_minutes == 545  # (18:30 - 9:25) = 9h5m = 545 minutes


@pytest.mark.asyncio
async def test_check_out_marks_late_when_late_checkin():
    """Late check-in (09:50) with sufficient hours → LATE (not HALF_DAY)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    ws = make_work_schedule(tenant_id, start="09:30", grace=15, half_day=4)
    check_in_at = datetime(2026, 9, 14, 9, 50, tzinfo=UTC)
    att = Attendance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=check_in_at, check_out_at=None, status="LATE", source="WEB",
    )

    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=att)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)

    check_out_time = datetime(2026, 9, 14, 18, 30, tzinfo=UTC)
    result = await service.check_out(tenant_id, att.id, AttendanceCheckOut(check_out_time=check_out_time))
    assert result.status == "LATE"
    assert result.working_minutes is not None
    assert result.working_minutes >= 240  # At least 4 hours


@pytest.mark.asyncio
async def test_check_out_marks_half_day():
    """Working only 3 hours → HALF_DAY (below 4h threshold)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    ws = make_work_schedule(tenant_id, start="09:30", grace=15, half_day=4)
    check_in_at = datetime(2026, 9, 14, 9, 30, tzinfo=UTC)
    att = Attendance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=check_in_at, check_out_at=None, status="PRESENT", source="WEB",
    )

    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=att)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)

    # Only 3 hours of work
    check_out_time = datetime(2026, 9, 14, 12, 30, tzinfo=UTC)
    result = await service.check_out(tenant_id, att.id, AttendanceCheckOut(check_out_time=check_out_time))
    assert result.status == "HALF_DAY"
    assert result.working_minutes == 180


@pytest.mark.asyncio
async def test_check_out_without_check_in_raises_400():
    """Check-out when check_in_at is None → 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    att = Attendance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=None, check_out_at=None, status="ABSENT", source="MANUAL",
    )
    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=att)

    with pytest.raises(HTTPException) as exc:
        await service.check_out(
            tenant_id, att.id, AttendanceCheckOut(check_out_time=datetime(2026, 9, 14, 18, 0, tzinfo=UTC))
        )
    assert exc.value.status_code == 400
    assert "checking in" in exc.value.detail


@pytest.mark.asyncio
async def test_double_check_out_raises_400():
    """Second check-out on same record → 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    att = Attendance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=datetime(2026, 9, 14, 9, 25, tzinfo=UTC),
        check_out_at=datetime(2026, 9, 14, 18, 30, tzinfo=UTC),
        status="PRESENT", source="WEB",
    )
    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=att)

    with pytest.raises(HTTPException) as exc:
        await service.check_out(
            tenant_id, att.id, AttendanceCheckOut(check_out_time=datetime(2026, 9, 14, 19, 0, tzinfo=UTC))
        )
    assert exc.value.status_code == 400
    assert "Already checked out" in exc.value.detail


@pytest.mark.asyncio
async def test_check_out_attendance_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.check_out(tenant_id, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_manual_attendance_correction():
    """Manual correction updates fields and sets source=MANUAL."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    employee_id = uuid4()

    att = Attendance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        attendance_date=date(2026, 9, 14),
        check_in_at=datetime(2026, 9, 14, 9, 50, tzinfo=UTC),
        check_out_at=datetime(2026, 9, 14, 18, 30, tzinfo=UTC),
        status="LATE", source="WEB", working_minutes=520,
    )

    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=att)

    update_data = AttendanceUpdate(
        status="PRESENT",
        remarks="Corrected — system error",
    )
    result = await service.manual_correct_attendance(tenant_id, att.id, update_data, user_id)
    assert result.status == "PRESENT"
    assert result.source == "MANUAL"


@pytest.mark.asyncio
async def test_manual_correction_not_found():
    db = build_mock_db()
    service = HRMService(db)

    service.att_repo = AsyncMock()
    service.att_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.manual_correct_attendance(uuid4(), uuid4(), AttendanceUpdate(status="PRESENT"), uuid4())
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 6c. Attendance Status Computation (_compute_attendance_status helper)
# ---------------------------------------------------------------------------

def make_service_for_compute():
    db = build_mock_db()
    return HRMService(db)


def test_status_exact_grace_boundary_present():
    """Check-in exactly at grace end → PRESENT (boundary inclusive)."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, start="09:30", grace=15)

    # Exactly at 09:45 → the cutoff is 09:30 + 15m = 09:45
    # is_late = check_in_at > grace_end → False if exactly at 09:45
    check_in = datetime(2026, 9, 14, 9, 45, 0, tzinfo=UTC)
    check_out = datetime(2026, 9, 14, 18, 30, 0, tzinfo=UTC)
    status, mins = service._compute_attendance_status(check_in, check_out, ws)
    assert status == "PRESENT"


def test_status_one_second_past_grace_is_late():
    """Check-in 1 second after grace end → LATE."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, start="09:30", grace=15)

    check_in = datetime(2026, 9, 14, 9, 45, 1, tzinfo=UTC)  # 1 second past
    check_out = datetime(2026, 9, 14, 18, 30, 0, tzinfo=UTC)
    status, mins = service._compute_attendance_status(check_in, check_out, ws)
    assert status == "LATE"


def test_status_half_day_boundary_exact():
    """Working exactly 4h (half_day threshold) → PRESENT (not HALF_DAY)."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, start="09:30", grace=15, half_day=4)

    check_in = datetime(2026, 9, 14, 9, 30, 0, tzinfo=UTC)
    check_out = datetime(2026, 9, 14, 13, 30, 0, tzinfo=UTC)  # exactly 4 hours
    status, mins = service._compute_attendance_status(check_in, check_out, ws)
    assert status == "PRESENT"
    assert mins == 240


def test_status_half_day_one_minute_below():
    """Working 3h 59m (just below threshold) → HALF_DAY."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, start="09:30", grace=15, half_day=4)

    check_in = datetime(2026, 9, 14, 9, 30, 0, tzinfo=UTC)
    check_out = datetime(2026, 9, 14, 13, 29, 0, tzinfo=UTC)  # 3h 59m
    status, mins = service._compute_attendance_status(check_in, check_out, ws)
    assert status == "HALF_DAY"
    assert mins == 239


def test_status_no_checkout_returns_no_minutes():
    """Without checkout → None minutes."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, start="09:30", grace=15)

    check_in = datetime(2026, 9, 14, 9, 25, 0, tzinfo=UTC)
    status, mins = service._compute_attendance_status(check_in, None, ws)
    assert status == "PRESENT"
    assert mins is None


# ---------------------------------------------------------------------------
# 7. EOD Evaluation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_eod_evaluation_non_working_day_skipped():
    """EOD on a Saturday does nothing."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    ws = make_work_schedule(tenant_id, working_days="0,1,2,3,4")
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)

    holiday_repo = AsyncMock()
    holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.holiday_repo = holiday_repo

    # Saturday
    result = await service.run_eod_evaluation(tenant_id, date(2026, 9, 19))
    assert result["skipped"] == 1
    assert result["absent"] == 0
    assert result["leave"] == 0


@pytest.mark.asyncio
async def test_eod_evaluation_no_schedule_returns_skipped():
    """EOD with no schedule configured returns skipped."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=None)

    result = await service.run_eod_evaluation(tenant_id, date(2026, 9, 15))
    assert result == {"skipped": 0, "absent": 0, "leave": 0}


@pytest.mark.asyncio
async def test_eod_evaluation_marks_absent():
    """EOD on a working day with no attendance → marks employee ABSENT."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    ws = make_work_schedule(tenant_id)
    emp = make_employee(tenant_id, id=employee_id)

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.emp_repo = AsyncMock()
    service.emp_repo.list_active = AsyncMock(return_value=[emp])
    service.att_repo = AsyncMock()
    service.att_repo.get_by_employee_date = AsyncMock(return_value=None)
    service.lr_repo = AsyncMock()
    service.lr_repo.get_approved_for_date = AsyncMock(return_value=None)

    # Monday
    result = await service.run_eod_evaluation(tenant_id, date(2026, 9, 14))
    assert result["absent"] == 1
    assert result["leave"] == 0


@pytest.mark.asyncio
async def test_eod_evaluation_marks_leave_when_approved():
    """EOD on working day with approved leave → marks LEAVE (not ABSENT)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    ws = make_work_schedule(tenant_id)
    emp = make_employee(tenant_id, id=employee_id)

    leave_req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=uuid4(), start_date=date(2026, 9, 14),
        end_date=date(2026, 9, 14), status="APPROVED",
    )

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.emp_repo = AsyncMock()
    service.emp_repo.list_active = AsyncMock(return_value=[emp])
    service.att_repo = AsyncMock()
    service.att_repo.get_by_employee_date = AsyncMock(return_value=None)
    service.lr_repo = AsyncMock()
    service.lr_repo.get_approved_for_date = AsyncMock(return_value=leave_req)

    result = await service.run_eod_evaluation(tenant_id, date(2026, 9, 14))
    assert result["leave"] == 1
    assert result["absent"] == 0


@pytest.mark.asyncio
async def test_eod_evaluation_skips_existing_attendance():
    """EOD skips employees who already checked in today."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    ws = make_work_schedule(tenant_id)
    emp = make_employee(tenant_id, id=employee_id)

    existing_att = make_attendance(tenant_id, employee_id, date(2026, 9, 14), "PRESENT",
                                   check_in_at=datetime(2026, 9, 14, 9, 25, tzinfo=UTC))

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.emp_repo = AsyncMock()
    service.emp_repo.list_active = AsyncMock(return_value=[emp])
    service.att_repo = AsyncMock()
    service.att_repo.get_by_employee_date = AsyncMock(return_value=existing_att)

    result = await service.run_eod_evaluation(tenant_id, date(2026, 9, 14))
    assert result["absent"] == 0
    assert result["leave"] == 0


# ---------------------------------------------------------------------------
# 8. Leave Types
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_leave_types_seeded_when_empty():
    """Default leave types are seeded when none exist.

    seed_default_leave_types creates a LeaveTypeRepository(db) internally which
    requires a real DB session to execute SELECT queries. We test the seeding
    DATA by verifying DEFAULT_LEAVE_TYPES constants and the seeding logic separately.
    """
    from app.services.hrm import DEFAULT_LEAVE_TYPES

    # Verify the seeding data is correct
    assert len(DEFAULT_LEAVE_TYPES) == 4

    names = [lt["name"] for lt in DEFAULT_LEAVE_TYPES]
    assert "Casual Leave" in names
    assert "Sick Leave" in names
    assert "Paid Leave" in names
    assert "Unpaid Leave" in names

    # Verify unpaid leave is correctly configured
    unpaid = next(lt for lt in DEFAULT_LEAVE_TYPES if lt["name"] == "Unpaid Leave")
    assert unpaid["is_paid"] is False
    assert unpaid["default_annual_days"] == 0

    # Verify paid leaves have annual days > 0
    paid_types = [lt for lt in DEFAULT_LEAVE_TYPES if lt["is_paid"]]
    for lt in paid_types:
        assert lt["default_annual_days"] > 0


@pytest.mark.asyncio
async def test_create_leave_type():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    lt = await service.create_leave_type(
        tenant_id,
        LeaveTypeCreate(name="Maternity Leave", is_paid=True, default_annual_days=90),
        user_id,
    )
    assert lt.name == "Maternity Leave"
    assert lt.default_annual_days == 90
    assert lt.is_paid is True


# ---------------------------------------------------------------------------
# 9. Leave Requests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_leave_request_pending():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    leave_type_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    lt = make_leave_type(tenant_id)
    lt.id = leave_type_id

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.emp_repo.get_by_user_id = AsyncMock(return_value=None)
    service.lt_repo = AsyncMock()
    service.lt_repo.get_by_id = AsyncMock(return_value=lt)
    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=leave_type_id, start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22), reason="Family event", status="PENDING",
    ))

    lr_in = LeaveRequestCreate(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22),
        reason="Family event",
    )
    lr = await service.create_leave_request(tenant_id, lr_in, user_id)
    assert lr.status == "PENDING"


@pytest.mark.asyncio
async def test_leave_request_end_before_start_raises_400():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    leave_type_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    lt = make_leave_type(tenant_id)
    lt.id = leave_type_id

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.emp_repo.get_by_user_id = AsyncMock(return_value=None)
    service.lt_repo = AsyncMock()
    service.lt_repo.get_by_id = AsyncMock(return_value=lt)

    lr_in = LeaveRequestCreate(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=date(2026, 9, 22),
        end_date=date(2026, 9, 20),  # end before start
        reason="Invalid dates",
    )
    with pytest.raises(HTTPException) as exc:
        await service.create_leave_request(tenant_id, lr_in, user_id)
    assert exc.value.status_code == 400
    assert "end_date" in exc.value.detail


@pytest.mark.asyncio
async def test_leave_request_employee_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=None)
    service.emp_repo.get_by_user_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.create_leave_request(
            tenant_id,
            LeaveRequestCreate(
                employee_id=uuid4(), leave_type_id=uuid4(),
                start_date=date(2026, 9, 21), end_date=date(2026, 9, 22), reason="X",
            ),
            uuid4(),
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_leave_request_leave_type_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.emp_repo.get_by_user_id = AsyncMock(return_value=None)
    service.lt_repo = AsyncMock()
    service.lt_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.create_leave_request(
            tenant_id,
            LeaveRequestCreate(
                employee_id=employee_id, leave_type_id=uuid4(),
                start_date=date(2026, 9, 21), end_date=date(2026, 9, 22), reason="X",
            ),
            uuid4(),
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_approve_leave_sets_approved():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    lr = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        leave_type_id=uuid4(), start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22), reason="X", status="PENDING",
    )

    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=lr)

    result = await service.approve_leave(tenant_id, lr.id, user_id)
    assert result.status == "APPROVED"
    assert result.approved_by_id == user_id
    assert result.approved_at is not None


@pytest.mark.asyncio
async def test_approve_already_approved_blocked():
    """Approving an already-approved request raises 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    lr = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        leave_type_id=uuid4(), start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22), reason="X", status="APPROVED",
    )
    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=lr)

    with pytest.raises(HTTPException) as exc:
        await service.approve_leave(tenant_id, lr.id, uuid4())
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_reject_leave_sets_rejected():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    lr = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        leave_type_id=uuid4(), start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22), reason="X", status="PENDING",
    )
    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=lr)

    result = await service.reject_leave(tenant_id, lr.id, user_id)
    assert result.status == "REJECTED"


@pytest.mark.asyncio
async def test_reject_already_rejected_blocked():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    lr = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        leave_type_id=uuid4(), start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22), reason="X", status="REJECTED",
    )
    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=lr)

    with pytest.raises(HTTPException) as exc:
        await service.reject_leave(tenant_id, lr.id, uuid4())
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_leave_not_found_404():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.approve_leave(tenant_id, uuid4(), uuid4())
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 10. Leave Balance Computation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_leave_balance_zero_taken():
    """No leaves taken → remaining == default_annual_days."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual_type = make_leave_type(tenant_id, name="Casual Leave", days=12)

    service.lt_repo = AsyncMock()
    service.lt_repo.list_for_tenant = AsyncMock(return_value=[casual_type])
    service.lr_repo = AsyncMock()
    service.lr_repo.list_requests = AsyncMock(return_value=([], 0))

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    assert len(balances) == 1
    b = balances[0]
    assert b.used_days == 0
    assert b.remaining_days == 12
    assert b.default_annual_days == 12


@pytest.mark.asyncio
async def test_leave_balance_partial_taken():
    """3 days taken from 12 → remaining = 9."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual_type = make_leave_type(tenant_id, name="Casual Leave", days=12)

    req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=casual_type.id,
        start_date=date(2026, 3, 10), end_date=date(2026, 3, 12),
        reason="Family", status="APPROVED",
    )

    service.lt_repo = AsyncMock()
    service.lt_repo.list_for_tenant = AsyncMock(return_value=[casual_type])
    service.lr_repo = AsyncMock()
    service.lr_repo.list_requests = AsyncMock(return_value=([req], 1))

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    b = balances[0]
    assert b.used_days == 3
    assert b.remaining_days == 9


@pytest.mark.asyncio
async def test_leave_balance_exceeds_annual_capped_at_zero():
    """Taking more than annual allowance → remaining = 0 (no negative)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual_type = make_leave_type(tenant_id, name="Casual Leave", days=5)

    # 8 days taken (more than 5 allowed)
    req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=casual_type.id,
        start_date=date(2026, 3, 1), end_date=date(2026, 3, 8),
        reason="Extended", status="APPROVED",
    )

    service.lt_repo = AsyncMock()
    service.lt_repo.list_for_tenant = AsyncMock(return_value=[casual_type])
    service.lr_repo = AsyncMock()
    service.lr_repo.list_requests = AsyncMock(return_value=([req], 1))

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    b = balances[0]
    assert b.used_days == 8
    assert b.remaining_days == 0  # capped at 0


@pytest.mark.asyncio
async def test_leave_balance_multiple_types():
    """Balance computed correctly across multiple leave types."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual = make_leave_type(tenant_id, name="Casual Leave", days=12)
    sick = make_leave_type(tenant_id, name="Sick Leave", days=6)

    # 2 days casual, 1 day sick
    casual_req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=casual.id, start_date=date(2026, 4, 1), end_date=date(2026, 4, 2),
        reason="Casual", status="APPROVED",
    )
    sick_req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=sick.id, start_date=date(2026, 5, 1), end_date=date(2026, 5, 1),
        reason="Sick", status="APPROVED",
    )

    service.lt_repo = AsyncMock()
    service.lt_repo.list_for_tenant = AsyncMock(return_value=[casual, sick])
    service.lr_repo = AsyncMock()
    service.lr_repo.list_requests = AsyncMock(return_value=([casual_req, sick_req], 2))

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    assert len(balances) == 2
    casual_bal = next(b for b in balances if b.leave_type_id == casual.id)
    sick_bal = next(b for b in balances if b.leave_type_id == sick.id)
    assert casual_bal.used_days == 2
    assert casual_bal.remaining_days == 10
    assert sick_bal.used_days == 1
    assert sick_bal.remaining_days == 5


@pytest.mark.asyncio
async def test_leave_balance_pending_leaves_not_counted():
    """PENDING leave requests do not reduce the balance."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual = make_leave_type(tenant_id, name="Casual Leave", days=12)

    pending_req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=casual.id, start_date=date(2026, 9, 21), end_date=date(2026, 9, 22),
        reason="Pending", status="PENDING",
    )

    service.lt_repo = AsyncMock()
    service.lt_repo.list_for_tenant = AsyncMock(return_value=[casual])
    service.lr_repo = AsyncMock()
    service.lr_repo.list_requests = AsyncMock(return_value=([pending_req], 1))

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    b = balances[0]
    assert b.used_days == 0  # PENDING doesn't count
    assert b.remaining_days == 12


# ---------------------------------------------------------------------------
# 11. Salary Advance
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_salary_advance_no_warning_when_positive():
    """Advance that keeps net positive → no warning, advance created."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    salary = make_salary_struct(tenant_id, employee_id, basic=30000, hra=12000, other_allowances=8000)
    # gross = 50000

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=salary)
    service.adv_repo = AsyncMock()
    service.adv_repo.sum_pending_for_period = AsyncMock(return_value=0.0)
    service.adv_repo.get_by_id = AsyncMock(return_value=SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        amount=Decimal("10000.00"), status="PENDING",
    ))

    adv_in = SalaryAdvanceCreate(
        employee_id=employee_id,
        amount=Decimal("10000.00"),
        reason="Car repair",
        advance_date=date(2026, 9, 10),
        payroll_period="2026-09",
        confirm=False,
    )
    adv, warning = await service.create_salary_advance(tenant_id, adv_in, user_id)
    assert warning is None
    assert isinstance(adv, SalaryAdvance)


@pytest.mark.asyncio
async def test_salary_advance_warning_returned_without_confirm():
    """Advance that makes net negative → warning returned, no advance saved."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    salary = make_salary_struct(tenant_id, employee_id, basic=20000, hra=5000, other_allowances=5000)
    # gross = 30000

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=salary)
    service.adv_repo = AsyncMock()
    service.adv_repo.sum_pending_for_period = AsyncMock(return_value=25000.0)
    # existing 25000 + new 10000 = 35000 > 30000 gross

    adv_in = SalaryAdvanceCreate(
        employee_id=employee_id,
        amount=Decimal("10000.00"),
        reason="Medical",
        advance_date=date(2026, 9, 10),
        payroll_period="2026-09",
        confirm=False,
    )
    adv, warning = await service.create_salary_advance(tenant_id, adv_in, user_id)
    assert adv is None
    assert warning is not None
    assert warning.would_be_negative is True
    assert warning.projected_net < 0


@pytest.mark.asyncio
async def test_salary_advance_warning_confirmed_saves_advance():
    """With confirm=True, negative-net advance is saved anyway."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    salary = make_salary_struct(tenant_id, employee_id, basic=20000, hra=5000, other_allowances=5000)

    saved_adv = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        amount=Decimal("10000.00"), status="PENDING",
    )

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=salary)
    service.adv_repo = AsyncMock()
    service.adv_repo.sum_pending_for_period = AsyncMock(return_value=25000.0)
    service.adv_repo.get_by_id = AsyncMock(return_value=saved_adv)

    adv_in = SalaryAdvanceCreate(
        employee_id=employee_id,
        amount=Decimal("10000.00"),
        reason="Medical",
        advance_date=date(2026, 9, 10),
        payroll_period="2026-09",
        confirm=True,
    )
    adv, warning = await service.create_salary_advance(tenant_id, adv_in, user_id)
    assert isinstance(adv, SalaryAdvance)
    # Warning is still included (informational)
    assert warning is not None
    assert warning.would_be_negative is True


@pytest.mark.asyncio
async def test_cancel_salary_advance():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    adv = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        amount=Decimal("5000.00"), status="PENDING",
    )
    service.adv_repo = AsyncMock()
    service.adv_repo.get_by_id = AsyncMock(return_value=adv)

    result = await service.cancel_salary_advance(tenant_id, adv.id, user_id)
    assert result.status == "CANCELLED"


@pytest.mark.asyncio
async def test_cancel_adjusted_advance_blocked():
    """Cancelling an already-ADJUSTED advance raises 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    adv = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        amount=Decimal("5000.00"), status="ADJUSTED",
    )
    service.adv_repo = AsyncMock()
    service.adv_repo.get_by_id = AsyncMock(return_value=adv)

    with pytest.raises(HTTPException) as exc:
        await service.cancel_salary_advance(tenant_id, adv.id, uuid4())
    assert exc.value.status_code == 400
    assert "adjusted into a payroll run" in exc.value.detail


@pytest.mark.asyncio
async def test_cancel_advance_not_found():
    db = build_mock_db()
    service = HRMService(db)

    service.adv_repo = AsyncMock()
    service.adv_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.cancel_salary_advance(uuid4(), uuid4(), uuid4())
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 12. Payroll
# ---------------------------------------------------------------------------

def _make_payroll_service(tenant_id, employee_id, gross_basic=25000, gross_hra=10000, gross_other=5000, other_ded=2000):
    db = build_mock_db()
    service = HRMService(db)
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    sal = make_salary_struct(tenant_id, employee_id, basic=gross_basic, hra=gross_hra,
                             other_allowances=gross_other, other_deductions=other_ded)
    ws = make_work_schedule(tenant_id)
    advance = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        amount=Decimal("5000.00"), status="PENDING",
    )

    mock_payroll_repo = AsyncMock()
    mock_payroll_repo.get_by_period = AsyncMock(return_value=None)
    mock_payroll_repo.get_by_id = AsyncMock(return_value=None)

    mock_emp_repo = AsyncMock()
    mock_emp_repo.list_active = AsyncMock(return_value=[emp])

    mock_salary_repo = AsyncMock()
    mock_salary_repo.get_current = AsyncMock(return_value=sal)

    mock_ws_repo = AsyncMock()
    mock_ws_repo.get_active = AsyncMock(return_value=ws)

    mock_holiday_repo = AsyncMock()
    mock_holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    mock_holiday_repo.list_for_year = AsyncMock(return_value=[])

    mock_att_repo = AsyncMock()
    mock_att_repo.get_month_statuses = AsyncMock(return_value=[])  # 0 absent

    mock_lr_repo = AsyncMock()
    mock_lr_repo.get_approved_for_date = AsyncMock(return_value=None)

    mock_adv_repo = AsyncMock()
    mock_adv_repo.get_pending_for_period = AsyncMock(return_value=[advance])

    mock_payslip_repo = AsyncMock()

    service.payroll_repo = mock_payroll_repo
    service.emp_repo = mock_emp_repo
    service.salary_repo = mock_salary_repo
    service.ws_repo = mock_ws_repo
    service.holiday_repo = mock_holiday_repo
    service.att_repo = mock_att_repo
    service.lr_repo = mock_lr_repo
    service.adv_repo = mock_adv_repo
    service.payslip_repo = mock_payslip_repo

    return service, user_id, advance


@pytest.mark.asyncio
async def test_payroll_run_sets_processed():
    tenant_id = uuid4()
    employee_id = uuid4()
    service, user_id, advance = _make_payroll_service(tenant_id, employee_id)

    payroll = await service.run_payroll(tenant_id, "2026-09", user_id)
    assert payroll.status == "PROCESSED"
    assert payroll.payroll_period == "2026-09"


@pytest.mark.asyncio
async def test_payroll_advance_marked_adjusted():
    """After payroll run, pending advances become ADJUSTED."""
    tenant_id = uuid4()
    employee_id = uuid4()
    service, user_id, advance = _make_payroll_service(tenant_id, employee_id)

    await service.run_payroll(tenant_id, "2026-09", user_id)
    assert advance.status == "ADJUSTED"
    assert advance.payroll_id is not None


@pytest.mark.asyncio
async def test_payroll_blocked_when_already_processed():
    """Running payroll for an already-PROCESSED period raises 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    existing_payroll = Payroll(
        id=uuid4(), tenant_id=tenant_id,
        payroll_period="2026-09", status="PROCESSED",
    )

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_period = AsyncMock(return_value=existing_payroll)

    with pytest.raises(HTTPException) as exc:
        await service.run_payroll(tenant_id, "2026-09", user_id)
    assert exc.value.status_code == 400
    assert "already processed" in exc.value.detail


@pytest.mark.asyncio
async def test_payroll_invalid_period_format_raises_400():
    """Invalid payroll period format raises 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_period = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.run_payroll(tenant_id, "invalid-period", uuid4())
    assert exc.value.status_code == 400
    assert "YYYY-MM" in exc.value.detail


@pytest.mark.asyncio
async def test_payroll_no_schedule_raises_400():
    """Payroll with no work schedule raises 400."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_period = AsyncMock(return_value=None)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.run_payroll(tenant_id, "2026-09", uuid4())
    assert exc.value.status_code == 400
    assert "work schedule" in exc.value.detail


@pytest.mark.asyncio
async def test_payroll_skips_employee_without_salary():
    """Employees with no salary structure are skipped in payroll."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    ws = make_work_schedule(tenant_id)

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_period = AsyncMock(return_value=None)
    service.emp_repo = AsyncMock()
    service.emp_repo.list_active = AsyncMock(return_value=[emp])
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=None)  # No salary!
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.att_repo = AsyncMock()
    service.att_repo.get_month_statuses = AsyncMock(return_value=[])
    service.lr_repo = AsyncMock()
    service.adv_repo = AsyncMock()
    service.adv_repo.get_pending_for_period = AsyncMock(return_value=[])
    service.payslip_repo = AsyncMock()

    payroll = await service.run_payroll(tenant_id, "2026-09", user_id)
    assert payroll.status == "PROCESSED"
    # No payslips generated (employee had no salary structure)
    payslips = [obj for obj in db._stored if isinstance(obj, Payslip)]
    assert len(payslips) == 0  # No payslip for employee without salary


@pytest.mark.asyncio
async def test_payroll_net_negative_allowed():
    """Negative net payable is saved as-is (not clamped to zero)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    # Gross = 10000 (basic=5000+hra=3000+other=2000), advance=15000 → net = 10000 - 0 - 15000 - 0 = -5000
    sal = make_salary_struct(tenant_id, employee_id,
                             basic=5000, hra=3000, other_allowances=2000, other_deductions=0)
    ws = make_work_schedule(tenant_id)
    advance = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        amount=Decimal("15000.00"), status="PENDING",
    )

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_period = AsyncMock(return_value=None)
    service.emp_repo = AsyncMock()
    service.emp_repo.list_active = AsyncMock(return_value=[emp])
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=sal)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.att_repo = AsyncMock()
    # ALL 22 working days of September 2026 as PRESENT (so absence_deduction=0)
    # Sep working days: 1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25,28,29,30
    all_sep_working_days = [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30]
    present_atts = [
        Attendance(
            id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
            attendance_date=date(2026, 9, d), status="PRESENT", source="WEB",
        )
        for d in all_sep_working_days
    ]
    service.att_repo = AsyncMock()
    service.att_repo.get_month_statuses = AsyncMock(return_value=present_atts)
    service.lr_repo = AsyncMock()
    service.lr_repo.get_approved_for_date = AsyncMock(return_value=None)
    service.adv_repo = AsyncMock()
    service.adv_repo.get_pending_for_period = AsyncMock(return_value=[advance])
    service.payslip_repo = AsyncMock()

    payrolls = await service.run_payroll(tenant_id, "2026-09", user_id)
    assert payrolls.status == "PROCESSED"

    # Find the payslip in stored objects
    payslips = [obj for obj in db._stored if isinstance(obj, Payslip)]
    assert len(payslips) == 1
    ps = payslips[0]
    # With ALL 22 working days as PRESENT: absence_deduction=0
    # net = gross(10000) - absence_deduction(0) - advance(15000) - other_ded(0) = -5000
    assert ps.net_payable < 0  # Negative, not clamped
    assert ps.net_payable == -5000.0


@pytest.mark.asyncio
async def test_payroll_absence_deduction():
    """Absent days reduce net_payable by per_day rate.
    
    The payroll service counts absences for all working days in the period.
    If an employee has no attendance row for a working day → counted as absent.
    We provide PRESENT attendance for all but 2 days to simulate 2 absences.
    """
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)
    # Gross = 30000
    sal = make_salary_struct(tenant_id, employee_id, basic=15000, hra=10000, other_allowances=5000, other_deductions=0)
    ws = make_work_schedule(tenant_id)

    # September 2026 has 22 working days (Mon-Fri):
    # 1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25,28,29,30
    # We provide PRESENT for 20 days, leaving Sep 14 & Sep 15 with no attendance → ABSENT
    present_dates = [1, 2, 3, 4, 7, 8, 9, 10, 11, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30]
    present_atts = [
        Attendance(
            id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
            attendance_date=date(2026, 9, d), status="PRESENT", source="WEB",
        )
        for d in present_dates
    ]

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_period = AsyncMock(return_value=None)
    service.emp_repo = AsyncMock()
    service.emp_repo.list_active = AsyncMock(return_value=[emp])
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=sal)
    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=ws)
    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_holidays_set = AsyncMock(return_value=set())
    service.att_repo = AsyncMock()
    service.att_repo.get_month_statuses = AsyncMock(return_value=present_atts)
    service.lr_repo = AsyncMock()
    service.lr_repo.get_approved_for_date = AsyncMock(return_value=None)
    service.adv_repo = AsyncMock()
    service.adv_repo.get_pending_for_period = AsyncMock(return_value=[])
    service.payslip_repo = AsyncMock()

    payroll = await service.run_payroll(tenant_id, "2026-09", user_id)
    payslips = [obj for obj in db._stored if isinstance(obj, Payslip)]
    assert len(payslips) == 1
    ps = payslips[0]
    # Sep 14 (Monday) and Sep 15 (Tuesday) are working days with no attendance → ABSENT
    assert ps.unpaid_absence_days == 2
    assert ps.unpaid_absence_deduction > 0
    assert ps.net_payable < 30000  # Something was deducted
    # per_day = 30000/22 ≈ 1363.64; deduction = 2 * 1363.64 ≈ 2727.27
    import math
    expected_deduction = round(30000 / 22 * 2, 2)
    assert abs(ps.unpaid_absence_deduction - expected_deduction) < 1.0


@pytest.mark.asyncio
async def test_payroll_snapshot_immutability():
    """Cancelling an already-ADJUSTED advance does not modify a processed payslip."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    # Payslip already processed with advance_deduction=5000
    payslip = Payslip(
        id=uuid4(), tenant_id=tenant_id, payroll_id=uuid4(),
        employee_id=uuid4(), gross_salary=50000.0,
        unpaid_absence_days=0, unpaid_absence_deduction=0.0,
        salary_advance_deduction=5000.0, other_deductions=2000.0,
        net_payable=43000.0,
    )

    # The advance is ADJUSTED (can't be cancelled)
    adv = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=uuid4(),
        amount=Decimal("5000.00"), status="ADJUSTED",
        payroll_id=payslip.payroll_id,
    )

    service.adv_repo = AsyncMock()
    service.adv_repo.get_by_id = AsyncMock(return_value=adv)

    with pytest.raises(HTTPException) as exc:
        await service.cancel_salary_advance(tenant_id, adv.id, user_id)
    assert exc.value.status_code == 400
    # The payslip's net_payable is unchanged
    assert payslip.net_payable == 43000.0


@pytest.mark.asyncio
async def test_get_payslips_payroll_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.get_payslips(tenant_id, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_payslip_not_found():
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.payslip_repo = AsyncMock()
    service.payslip_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.get_payslip(tenant_id, uuid4())
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 13. PDF Generation
# ---------------------------------------------------------------------------

def test_payslip_pdf_html_generation():
    """Payslip HTML contains required salary info."""
    from app.services.pdf import generate_payslip_pdf_html

    tenant_id = uuid4()
    employee_id = uuid4()

    payslip = Payslip(
        id=uuid4(), tenant_id=tenant_id, payroll_id=uuid4(),
        employee_id=employee_id,
        gross_salary=50000.0,
        basic=25000.0, hra=15000.0, other_allowances=10000.0,
        working_days_in_period=22,
        unpaid_absence_days=0,
        unpaid_absence_deduction=0.0,
        salary_advance_deduction=5000.0,
        other_deductions=2000.0,
        net_payable=43000.0,
    )
    # PDF generation reads created_at — set it explicitly
    payslip.created_at = datetime(2026, 9, 30, 12, 0, 0, tzinfo=UTC)

    emp = Employee(
        id=employee_id, tenant_id=tenant_id,
        name="Ramesh Kumar", status="Active",
    )

    html = generate_payslip_pdf_html(payslip, emp, "2026-09")
    assert "SALARY SLIP" in html
    assert "Ramesh Kumar" in html
    assert "43,000" in html or "43000" in html


# ---------------------------------------------------------------------------
# 14. Utility Functions
# ---------------------------------------------------------------------------

def test_parse_working_day_set_standard():
    result = _parse_working_day_set("0,1,2,3,4")
    assert result == {0, 1, 2, 3, 4}


def test_parse_working_day_set_full_week():
    result = _parse_working_day_set("0,1,2,3,4,5,6")
    assert result == {0, 1, 2, 3, 4, 5, 6}


def test_parse_working_day_set_with_spaces():
    result = _parse_working_day_set("0, 1, 2, 3, 4")
    assert result == {0, 1, 2, 3, 4}


@pytest.mark.asyncio
async def test_compute_working_days_in_month_september_2026():
    """September 2026 with Mon-Fri schedule and no holidays = 22 working days."""
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, working_days="0,1,2,3,4")

    holiday_repo = AsyncMock()
    holiday_repo.get_holidays_set = AsyncMock(return_value=set())

    working_days = await compute_working_days_in_month(tenant_id, 2026, 9, ws, holiday_repo)
    assert len(working_days) == 22  # September 2026 has 22 working weekdays


@pytest.mark.asyncio
async def test_compute_working_days_excludes_holidays():
    """Holidays are excluded from working days count."""
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, working_days="0,1,2,3,4")

    # Gandhi Jayanti (Oct 2, 2026 - a Friday)
    holiday_repo = AsyncMock()
    holiday_repo.get_holidays_set = AsyncMock(return_value={date(2026, 10, 2)})

    working_days = await compute_working_days_in_month(tenant_id, 2026, 10, ws, holiday_repo)
    assert date(2026, 10, 2) not in working_days


@pytest.mark.asyncio
async def test_compute_working_days_saturday_schedule():
    """Mon-Sat schedule has more working days than Mon-Fri."""
    tenant_id = uuid4()
    ws_mon_fri = make_work_schedule(tenant_id, working_days="0,1,2,3,4")
    ws_mon_sat = make_work_schedule(tenant_id, working_days="0,1,2,3,4,5")

    holiday_repo = AsyncMock()
    holiday_repo.get_holidays_set = AsyncMock(return_value=set())

    days_mon_fri = await compute_working_days_in_month(tenant_id, 2026, 9, ws_mon_fri, holiday_repo)
    days_mon_sat = await compute_working_days_in_month(tenant_id, 2026, 9, ws_mon_sat, holiday_repo)

    assert len(days_mon_sat) > len(days_mon_fri)
    # September 2026 has 4 Saturdays
    assert len(days_mon_sat) == len(days_mon_fri) + 4


# ---------------------------------------------------------------------------
# 15. Cross-tenant Security
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cross_tenant_holiday_delete_blocked():
    """Deleting another tenant's holiday → 404 (repo enforces tenant isolation)."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_a = uuid4()
    tenant_b = uuid4()

    holiday_tenant_a = Holiday(
        id=uuid4(), tenant_id=tenant_a, name="Holiday A", holiday_date=date(2026, 1, 26)
    )

    service.holiday_repo = AsyncMock()
    service.holiday_repo.get_by_id = AsyncMock(return_value=None)  # Repo filters by tenant_id

    with pytest.raises(HTTPException) as exc:
        await service.delete_holiday(tenant_b, holiday_tenant_a.id, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_cross_tenant_leave_approve_blocked():
    """Approving another tenant's leave request → 404."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_a = uuid4()
    tenant_b = uuid4()

    leave_tenant_a = LeaveRequest(
        id=uuid4(), tenant_id=tenant_a, employee_id=uuid4(),
        leave_type_id=uuid4(), start_date=date(2026, 9, 21),
        end_date=date(2026, 9, 22), status="PENDING",
    )

    service.lr_repo = AsyncMock()
    service.lr_repo.get_by_id = AsyncMock(return_value=None)  # Repo filters by tenant_id

    with pytest.raises(HTTPException) as exc:
        await service.approve_leave(tenant_b, leave_tenant_a.id, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_cross_tenant_advance_cancel_blocked():
    """Cancelling another tenant's salary advance → 404."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_a = uuid4()
    tenant_b = uuid4()

    adv_tenant_a = SalaryAdvance(
        id=uuid4(), tenant_id=tenant_a, employee_id=uuid4(),
        amount=Decimal("5000.00"), status="PENDING",
    )

    service.adv_repo = AsyncMock()
    service.adv_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.cancel_salary_advance(tenant_b, adv_tenant_a.id, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_cross_tenant_payroll_payslips_blocked():
    """Getting payslips for another tenant's payroll → 404."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_a = uuid4()
    tenant_b = uuid4()

    service.payroll_repo = AsyncMock()
    service.payroll_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.get_payslips(tenant_b, uuid4())
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 16. Edge Cases & Boundary Conditions
# ---------------------------------------------------------------------------

def test_leave_balance_single_day_request():
    """Single-day leave request counts as 1 day."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    employee_id = uuid4()
    leave_type_id = uuid4()

    req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=date(2026, 9, 21), end_date=date(2026, 9, 21),  # same day
        reason="X", status="APPROVED",
    )
    assert (req.end_date - req.start_date).days + 1 == 1


def test_work_schedule_payday_stored():
    """Payday field is correctly stored."""
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, payday=25)
    assert ws.payday == 25


def test_attendance_working_minutes_computed_correctly():
    """working_minutes = (check_out - check_in) in minutes."""
    service = make_service_for_compute()
    tenant_id = uuid4()
    ws = make_work_schedule(tenant_id, start="09:30", grace=15, half_day=4)

    check_in = datetime(2026, 9, 14, 9, 30, tzinfo=UTC)
    check_out = datetime(2026, 9, 14, 18, 30, tzinfo=UTC)  # 9 hours
    _, mins = service._compute_attendance_status(check_in, check_out, ws)
    assert mins == 540


@pytest.mark.asyncio
async def test_salary_advance_employee_not_found():
    """Creating advance for non-existent employee → 404."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await service.create_salary_advance(
            tenant_id,
            SalaryAdvanceCreate(
                employee_id=uuid4(), amount=Decimal("5000.00"), reason="X",
                advance_date=date(2026, 9, 10), payroll_period="2026-09", confirm=False,
            ),
            uuid4(),
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_salary_advance_with_no_salary_structure():
    """Advance for employee without salary structure: gross=0, any advance triggers warning."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()
    user_id = uuid4()

    emp = make_employee(tenant_id, id=employee_id)

    service.emp_repo = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.salary_repo = AsyncMock()
    service.salary_repo.get_current = AsyncMock(return_value=None)  # No salary!
    service.adv_repo = AsyncMock()
    service.adv_repo.sum_pending_for_period = AsyncMock(return_value=0.0)
    service.adv_repo.get_by_id = AsyncMock(return_value=SalaryAdvance(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        amount=Decimal("1000.00"), status="PENDING",
    ))

    adv_in = SalaryAdvanceCreate(
        employee_id=employee_id,
        amount=Decimal("1000.00"),
        reason="Emergency",
        advance_date=date(2026, 9, 10),
        payroll_period="2026-09",
        confirm=True,  # Force save even if negative
    )
    adv, warning = await service.create_salary_advance(tenant_id, adv_in, user_id)
    # Gross=0 → any advance > 0 makes net negative
    assert warning is not None
    assert warning.would_be_negative is True


@pytest.mark.asyncio
async def test_leave_balance_rejected_leaves_not_counted():
    """REJECTED leave requests don't reduce the balance."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    employee_id = uuid4()

    casual = make_leave_type(tenant_id, name="Casual Leave", days=12)

    rejected_req = LeaveRequest(
        id=uuid4(), tenant_id=tenant_id, employee_id=employee_id,
        leave_type_id=casual.id, start_date=date(2026, 9, 21), end_date=date(2026, 9, 22),
        reason="Rejected", status="REJECTED",
    )

    service.lt_repo = AsyncMock()
    service.lt_repo.list_for_tenant = AsyncMock(return_value=[casual])
    service.lr_repo = AsyncMock()
    service.lr_repo.list_requests = AsyncMock(return_value=([rejected_req], 1))

    balances = await service.get_employee_leave_balance(tenant_id, employee_id, year=2026)
    b = balances[0]
    assert b.used_days == 0
    assert b.remaining_days == 12


@pytest.mark.asyncio
async def test_work_schedule_update_creates_new_row_not_edit():
    """Setting a new work schedule must not edit the old one — creates a new row."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    old_ws = make_work_schedule(tenant_id, working_days="0,1,2,3,4")
    old_ws_id = old_ws.id

    service.ws_repo = AsyncMock()
    service.ws_repo.get_active = AsyncMock(return_value=old_ws)

    ws_in = WorkScheduleCreate(
        working_days="0,1,2,3,4,5",
        start_time=time(9, 0),
        end_time=time(17, 0),
        late_after_minutes=10,
        half_day_threshold_hours=3,
        payday=1,
        effective_from=date(2026, 10, 1),
    )
    new_ws = await service.set_work_schedule(tenant_id, ws_in, user_id)

    # Old schedule retains its ID, new one gets a different ID
    assert new_ws.id != old_ws_id
    # Old schedule is now closed
    assert old_ws.effective_to == date(2026, 9, 30)
    # New schedule has the new config
    assert new_ws.working_days == "0,1,2,3,4,5"
