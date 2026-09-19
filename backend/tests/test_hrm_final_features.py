"""Unit tests for hrm_final.md features:
- Employee login setup (Section 2.5) & inline creation
- Employee self-service dashboard data & self payslips
- Self-service check-in, check-out, and leave application auto-deriving employee_id
- Holiday detail and update methods
"""

from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.hrm import Employee, Attendance, Holiday, LeaveType, LeaveRequest, SalaryStructure
from app.models.domain import User, TenantMember
from app.schemas.hrm import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    EmployeeCreate,
    EmployeeUpdate,
    HolidayUpdate,
    LeaveRequestCreate,
)
from app.services.hrm import HRMService, seed_default_work_schedule, seed_default_leave_types


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
async def test_setup_employee_login():
    """Test HR setting login access for an existing employee."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    admin_id = uuid4()

    emp = Employee(
        id=uuid4(),
        tenant_id=tenant_id,
        name="Ankit Sharma",
        email="ankit@company.com",
        status="Active",
        user_id=None,
    )

    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    db.execute = AsyncMock()
    mock_user_res = MagicMock()
    mock_user_res.scalar_one_or_none.return_value = None
    mock_tm_res = MagicMock()
    mock_tm_res.scalar_one_or_none.return_value = None
    db.execute.side_effect = [mock_user_res, mock_tm_res]

    res = await service.setup_employee_login(tenant_id, emp.id, "ankit@company.com", "Password123!", admin_id)
    assert res is not None
    assert emp.user_id is not None
    db.commit.assert_called()


@pytest.mark.asyncio
async def test_create_employee_with_login_access():
    """Test creating an employee with give_login_access enabled."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    admin_id = uuid4()

    service.setup_employee_login = AsyncMock()
    service.emp_repo.get_by_id = AsyncMock()

    create_data = EmployeeCreate(
        name="Sunil Verma",
        email="sunil@company.com",
        employment_type="Full-time",
        give_login_access=True,
        username="sunil@company.com",
        password="Password123!",
    )

    await service.create_employee(tenant_id, create_data, admin_id)
    service.setup_employee_login.assert_called_once()


@pytest.mark.asyncio
async def test_self_service_check_in_derives_employee():
    """Test check_in auto-deriving employee_id when missing in schema."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()

    emp = Employee(id=uuid4(), tenant_id=tenant_id, name="Self Service Emp", user_id=user_id)
    service.emp_repo.get_by_user_id = AsyncMock(return_value=emp)
    service.ws_repo.get_active = AsyncMock(return_value=MagicMock(working_days="0,1,2,3,4,5,6", start_time=datetime.strptime("09:30", "%H:%M").time(), late_after_minutes=15, half_day_threshold_hours=4))
    service.holiday_repo.is_holiday = AsyncMock(return_value=False)
    service.att_repo.get_by_employee_date = AsyncMock(return_value=None)

    checkin_data = AttendanceCheckIn(employee_id=None, remarks="Self checkin")
    att = await service.check_in(tenant_id, checkin_data, user_id)
    assert att.employee_id == emp.id
    assert att.remarks == "Self checkin"


@pytest.mark.asyncio
async def test_self_service_check_out_derives_attendance():
    """Test check_out auto-deriving attendance_id when missing."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    emp_id = uuid4()

    emp = Employee(id=emp_id, tenant_id=tenant_id, name="Self Service Emp", user_id=user_id)
    open_att = Attendance(
        id=uuid4(),
        tenant_id=tenant_id,
        employee_id=emp_id,
        attendance_date=date.today(),
        check_in_at=datetime.now(UTC) - timedelta(hours=8),
        status="PRESENT",
    )

    service.emp_repo.get_by_user_id = AsyncMock(return_value=emp)
    service.att_repo.get_by_employee_date = AsyncMock(return_value=open_att)
    service.att_repo.get_by_id = AsyncMock(return_value=open_att)
    service.ws_repo.get_active = AsyncMock(return_value=MagicMock(start_time=datetime.strptime("09:30", "%H:%M").time(), late_after_minutes=15, half_day_threshold_hours=4))

    cout_data = AttendanceCheckOut(attendance_id=None, remarks="Self checkout")
    att = await service.check_out(tenant_id, None, cout_data, user_id, "Self checkout")
    assert att.check_out_at is not None
    assert att.working_minutes is not None


@pytest.mark.asyncio
async def test_self_service_leave_request_derives_employee():
    """Test leave request creation auto-deriving employee_id."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    emp_id = uuid4()
    lt_id = uuid4()

    emp = Employee(id=emp_id, tenant_id=tenant_id, name="Self Leave Emp", user_id=user_id)
    lt = LeaveType(id=lt_id, tenant_id=tenant_id, name="Casual Leave", is_paid=True)

    service.emp_repo.get_by_user_id = AsyncMock(return_value=emp)
    service.emp_repo.get_by_id = AsyncMock(return_value=emp)
    service.lt_repo.get_by_id = AsyncMock(return_value=lt)
    service.lr_repo.get_by_id = AsyncMock(side_effect=lambda t, id: LeaveRequest(id=id, tenant_id=tenant_id, employee_id=emp_id, leave_type_id=lt_id, start_date=date.today(), end_date=date.today(), status="PENDING"))

    req_data = LeaveRequestCreate(employee_id=None, leave_type_id=lt_id, start_date=date.today(), end_date=date.today(), reason="Personal")
    lreq = await service.create_leave_request(tenant_id, req_data, user_id)
    assert lreq.employee_id == emp_id
    assert lreq.status == "PENDING"


@pytest.mark.asyncio
async def test_get_employee_dashboard():
    """Test get_employee_dashboard aggregation."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    emp_id = uuid4()

    emp = Employee(id=emp_id, tenant_id=tenant_id, name="Dash Emp", user_id=user_id)
    service.emp_repo.get_by_user_id = AsyncMock(return_value=emp)
    service.att_repo.get_by_employee_date = AsyncMock(return_value=None)
    service.att_repo.get_month_statuses = AsyncMock(return_value=[
        Attendance(tenant_id=tenant_id, employee_id=emp_id, attendance_date=date.today(), status="PRESENT"),
        Attendance(tenant_id=tenant_id, employee_id=emp_id, attendance_date=date.today(), status="LATE"),
    ])
    service.get_employee_leave_balance = AsyncMock(return_value=[])
    service.lr_repo.list_requests = AsyncMock(return_value=([], 0))

    dash = await service.get_employee_dashboard(tenant_id, user_id)
    assert dash["employee"].name == "Dash Emp"
    assert dash["month_summary"]["present"] == 1
    assert dash["month_summary"]["late"] == 1


@pytest.mark.asyncio
async def test_update_holiday():
    """Test update_holiday service method."""
    db = build_mock_db()
    service = HRMService(db)
    tenant_id = uuid4()
    user_id = uuid4()
    hol_id = uuid4()

    hol = Holiday(id=hol_id, tenant_id=tenant_id, name="Diwali", holiday_date=date(2026, 11, 1))
    service.holiday_repo.get_by_id = AsyncMock(return_value=hol)

    updated = await service.update_holiday(tenant_id, hol_id, HolidayUpdate(name="Deepavali Festival", holiday_date=date(2026, 11, 2)), user_id)
    assert updated.name == "Deepavali Festival"
    assert updated.holiday_date == date(2026, 11, 2)
