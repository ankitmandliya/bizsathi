"""HRM Module — Service layer with all business logic.

Covers: WorkSchedule, Holiday, Department, Designation, Employee,
SalaryStructure, Attendance (check-in/out + EOD), Leave, SalaryAdvance, Payroll.
"""

import calendar
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.domain import TenantMember, User
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
from app.repositories.hrm import (
    AttendanceRepository,
    DepartmentRepository,
    DesignationRepository,
    EmployeeRepository,
    HolidayRepository,
    LeaveRequestRepository,
    LeaveTypeRepository,
    PayrollRepository,
    PayslipRepository,
    SalaryAdvanceRepository,
    SalaryStructureRepository,
    WorkScheduleRepository,
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
    HolidayUpdate,
    LeaveBalanceResponse,
    LeaveRequestCreate,
    LeaveTypeCreate,
    SalaryAdvanceCreate,
    SalaryAdvanceWarning,
    SalaryStructureCreate,
    SetupLoginRequest,
    WorkScheduleCreate,
)
from app.services.audit import log_audit_event



# ---------------------------------------------------------------------------
# Default work schedule seeding (Mon-Fri 09:30-18:30, Payday 1st)
# ---------------------------------------------------------------------------


async def seed_default_work_schedule(db: AsyncSession, tenant_id: UUID) -> WorkSchedule:
    today = datetime.now(UTC).date()
    ws = WorkSchedule(
        tenant_id=tenant_id,
        working_days="0,1,2,3,4",
        start_time=datetime.strptime("09:30", "%H:%M").time(),
        end_time=datetime.strptime("18:30", "%H:%M").time(),
        late_after_minutes=15,
        half_day_threshold_hours=4,
        payday=1,
        effective_from=today,
    )
    db.add(ws)
    await db.flush()
    return ws




# ---------------------------------------------------------------------------
# Default leave type seeds (same pattern as CRM pipeline stages)
# ---------------------------------------------------------------------------

DEFAULT_LEAVE_TYPES = [
    {"name": "Casual Leave", "is_paid": True, "default_annual_days": 12},
    {"name": "Sick Leave", "is_paid": True, "default_annual_days": 6},
    {"name": "Paid Leave", "is_paid": True, "default_annual_days": 15},
    {"name": "Unpaid Leave", "is_paid": False, "default_annual_days": 0},
]


async def seed_default_leave_types(db: AsyncSession, tenant_id: UUID) -> list[LeaveType]:
    repo = LeaveTypeRepository(db)
    existing = await repo.list_for_tenant(tenant_id)
    if existing:
        return list(existing)
    types: list[LeaveType] = []
    for lt_data in DEFAULT_LEAVE_TYPES:
        lt = LeaveType(tenant_id=tenant_id, **lt_data)
        db.add(lt)
        types.append(lt)
    await db.flush()
    return types


# ---------------------------------------------------------------------------
# Helper: compute working days in a month
# ---------------------------------------------------------------------------


def _parse_working_day_set(working_days_str: str) -> set[int]:
    """Convert "0,1,2,3,4" → {0, 1, 2, 3, 4}."""
    return {int(d.strip()) for d in working_days_str.split(",") if d.strip()}


async def compute_working_days_in_month(
    tenant_id: UUID,
    year: int,
    month: int,
    schedule: WorkSchedule,
    holiday_repo: HolidayRepository,
) -> list[date]:
    """Return list of actual working day dates for the month (excludes weekoffs and holidays)."""
    working_day_nums = _parse_working_day_set(schedule.working_days)
    holiday_dates = await holiday_repo.get_holidays_set(tenant_id, year, month)
    _, num_days = calendar.monthrange(year, month)
    working_dates = []
    for day_num in range(1, num_days + 1):
        d = date(year, month, day_num)
        if d.weekday() in working_day_nums and d not in holiday_dates:
            working_dates.append(d)
    return working_dates


def is_working_day(d: date, schedule: WorkSchedule, holidays: set[date]) -> bool:
    working_nums = _parse_working_day_set(schedule.working_days)
    return d.weekday() in working_nums and d not in holidays


# ---------------------------------------------------------------------------
# HRM Service
# ---------------------------------------------------------------------------


class HRMService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.dept_repo = DepartmentRepository(db)
        self.desig_repo = DesignationRepository(db)
        self.ws_repo = WorkScheduleRepository(db)
        self.holiday_repo = HolidayRepository(db)
        self.emp_repo = EmployeeRepository(db)
        self.salary_repo = SalaryStructureRepository(db)
        self.att_repo = AttendanceRepository(db)
        self.lt_repo = LeaveTypeRepository(db)
        self.lr_repo = LeaveRequestRepository(db)
        self.adv_repo = SalaryAdvanceRepository(db)
        self.payroll_repo = PayrollRepository(db)
        self.payslip_repo = PayslipRepository(db)

    # -----------------------------------------------------------------------
    # Work Schedule
    # -----------------------------------------------------------------------

    async def get_active_schedule(self, tenant_id: UUID) -> WorkSchedule:
        sched = await self.ws_repo.get_active(tenant_id)
        if not sched:
            sched = await seed_default_work_schedule(self.db, tenant_id)
            await self.db.commit()
            await self.db.refresh(sched)
        return sched

    async def set_work_schedule(
        self, tenant_id: UUID, data: WorkScheduleCreate, user_id: UUID
    ) -> WorkSchedule:
        # Close the existing active schedule one day before the new one starts
        existing = await self.ws_repo.get_active(tenant_id)
        if existing:
            close_date = data.effective_from - timedelta(days=1)
            existing.effective_to = close_date
            await self.db.flush()

        new_sched = WorkSchedule(
            tenant_id=tenant_id,
            working_days=data.working_days,
            start_time=data.start_time,
            end_time=data.end_time,
            late_after_minutes=data.late_after_minutes,
            half_day_threshold_hours=data.half_day_threshold_hours,
            payday=data.payday,
            effective_from=data.effective_from,
        )
        self.db.add(new_sched)
        await self.db.commit()
        await self.db.refresh(new_sched)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="create",
            entity_type="WorkSchedule",
            entity_id=str(new_sched.id),
        )
        return new_sched

    # -----------------------------------------------------------------------
    # Holidays
    # -----------------------------------------------------------------------

    async def list_holidays(self, tenant_id: UUID, year: int | None = None) -> list[Holiday]:
        if year:
            return list(await self.holiday_repo.list_for_year(tenant_id, year))
        return list(await self.holiday_repo.list_for_tenant(tenant_id))

    async def get_holiday(self, tenant_id: UUID, holiday_id: UUID) -> Holiday:
        h = await self.holiday_repo.get_by_id(tenant_id, holiday_id)
        if not h:
            raise HTTPException(status_code=404, detail="Holiday not found")
        return h

    async def create_holiday(self, tenant_id: UUID, data: HolidayCreate, user_id: UUID) -> Holiday:
        h = Holiday(tenant_id=tenant_id, name=data.name, holiday_date=data.holiday_date)
        self.db.add(h)
        await self.db.commit()
        await self.db.refresh(h)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="create",
            entity_type="Holiday",
            entity_id=str(h.id),
            details={"name": data.name, "date": str(data.holiday_date)},
        )
        return h

    async def update_holiday(self, tenant_id: UUID, holiday_id: UUID, data: HolidayUpdate, user_id: UUID) -> Holiday:
        h = await self.holiday_repo.get_by_id(tenant_id, holiday_id)
        if not h:
            raise HTTPException(status_code=404, detail="Holiday not found")
        if data.name is not None:
            h.name = data.name
        if data.holiday_date is not None:
            h.holiday_date = data.holiday_date
        await self.db.commit()
        await self.db.refresh(h)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="update",
            entity_type="Holiday",
            entity_id=str(holiday_id),
        )
        return h

    async def delete_holiday(self, tenant_id: UUID, holiday_id: UUID, user_id: UUID) -> None:

        h = await self.holiday_repo.get_by_id(tenant_id, holiday_id)
        if not h:
            raise HTTPException(status_code=404, detail="Holiday not found")
        await self.db.delete(h)
        await self.db.commit()
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="delete",
            entity_type="Holiday",
            entity_id=str(holiday_id),
        )

    # -----------------------------------------------------------------------
    # Departments
    # -----------------------------------------------------------------------

    async def list_departments(self, tenant_id: UUID) -> list[Department]:
        return list(await self.dept_repo.list_for_tenant(tenant_id))

    async def create_department(self, tenant_id: UUID, data: DepartmentCreate, user_id: UUID) -> Department:
        dept = Department(tenant_id=tenant_id, name=data.name)
        self.db.add(dept)
        await self.db.commit()
        await self.db.refresh(dept)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="create",
                               entity_type="Department", entity_id=str(dept.id))
        return dept

    async def update_department(self, tenant_id: UUID, dept_id: UUID, data: DepartmentUpdate, user_id: UUID) -> Department:
        dept = await self.dept_repo.get_by_id(tenant_id, dept_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        if data.name is not None:
            dept.name = data.name
        await self.db.commit()
        await self.db.refresh(dept)
        return dept

    async def delete_department(self, tenant_id: UUID, dept_id: UUID, user_id: UUID) -> None:
        dept = await self.dept_repo.get_by_id(tenant_id, dept_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        await self.db.delete(dept)
        await self.db.commit()

    # -----------------------------------------------------------------------
    # Designations
    # -----------------------------------------------------------------------

    async def list_designations(self, tenant_id: UUID) -> list[Designation]:
        return list(await self.desig_repo.list_for_tenant(tenant_id))

    async def create_designation(self, tenant_id: UUID, data: DesignationCreate, user_id: UUID) -> Designation:
        desig = Designation(tenant_id=tenant_id, name=data.name, department_id=data.department_id)
        self.db.add(desig)
        await self.db.commit()
        await self.db.refresh(desig)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="create",
                               entity_type="Designation", entity_id=str(desig.id))
        return desig

    async def update_designation(self, tenant_id: UUID, desig_id: UUID, data: DesignationUpdate, user_id: UUID) -> Designation:
        desig = await self.desig_repo.get_by_id(tenant_id, desig_id)
        if not desig:
            raise HTTPException(status_code=404, detail="Designation not found")
        if data.name is not None:
            desig.name = data.name
        if data.department_id is not None:
            desig.department_id = data.department_id
        await self.db.commit()
        await self.db.refresh(desig)
        return desig

    async def delete_designation(self, tenant_id: UUID, desig_id: UUID, user_id: UUID) -> None:
        desig = await self.desig_repo.get_by_id(tenant_id, desig_id)
        if not desig:
            raise HTTPException(status_code=404, detail="Designation not found")
        await self.db.delete(desig)
        await self.db.commit()

    # -----------------------------------------------------------------------
    # Employees
    # -----------------------------------------------------------------------

    async def list_employees(
        self, tenant_id: UUID, search: str | None, dept_id: UUID | None, emp_status: str | None,
        page: int, limit: int
    ) -> tuple[list[Employee], int]:
        skip = (page - 1) * limit
        rows, total = await self.emp_repo.list_employees(tenant_id, search, dept_id, emp_status, skip, limit)
        return list(rows), total

    async def get_employee(self, tenant_id: UUID, employee_id: UUID) -> Employee:
        emp = await self.emp_repo.get_by_id(tenant_id, employee_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        return emp

    async def setup_employee_login(
        self, tenant_id: UUID, employee_id: UUID, username: str, password: str, admin_user_id: UUID
    ) -> Employee:
        emp = await self.emp_repo.get_by_id(tenant_id, employee_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        email_clean = username.strip().lower()

        stmt = select(User).where(User.email == email_clean)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            user = User(
                email=email_clean,
                password_hash=hash_password(password),
                full_name=emp.name,
                is_active=True,
                is_verified=True,
            )
            self.db.add(user)
            await self.db.flush()
        else:
            user.password_hash = hash_password(password)
            if not user.is_active:
                user.is_active = True

        tm_stmt = select(TenantMember).where(
            TenantMember.tenant_id == tenant_id, TenantMember.user_id == user.id
        )
        tm_res = await self.db.execute(tm_stmt)
        member = tm_res.scalar_one_or_none()
        if not member:
            member = TenantMember(
                tenant_id=tenant_id,
                user_id=user.id,
                is_owner=False,
                status="active",
            )
            self.db.add(member)

        emp.user_id = user.id
        await self.db.commit()
        emp = await self.emp_repo.get_by_id(tenant_id, employee_id)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=admin_user_id,
            action="setup_login",
            entity_type="Employee",
            entity_id=str(employee_id),
            details={"username": email_clean, "user_id": str(user.id)},
        )
        return emp  # type: ignore[return-value]

    async def create_employee(self, tenant_id: UUID, data: EmployeeCreate, user_id: UUID) -> Employee:
        login_requested = data.give_login_access
        username = data.username
        password = data.password

        create_data = data.model_dump(exclude={"give_login_access", "username", "password"})
        emp = Employee(tenant_id=tenant_id, **create_data)
        self.db.add(emp)
        await self.db.commit()
        await self.db.refresh(emp)

        if login_requested and username and password:
            await self.setup_employee_login(tenant_id, emp.id, username, password, user_id)

        emp = await self.emp_repo.get_by_id(tenant_id, emp.id)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="create",
                               entity_type="Employee", entity_id=str(emp.id),  # type: ignore[union-attr]
                               details={"name": data.name})
        return emp  # type: ignore[return-value]

    async def update_employee(self, tenant_id: UUID, employee_id: UUID, data: EmployeeUpdate, user_id: UUID) -> Employee:
        emp = await self.emp_repo.get_by_id(tenant_id, employee_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        login_requested = data.give_login_access
        username = data.username
        password = data.password

        update_data = data.model_dump(exclude={"give_login_access", "username", "password"}, exclude_none=True)
        for field, value in update_data.items():
            setattr(emp, field, value)
        await self.db.commit()

        if login_requested and username and password:
            await self.setup_employee_login(tenant_id, employee_id, username, password, user_id)

        emp = await self.emp_repo.get_by_id(tenant_id, employee_id)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="update",
                               entity_type="Employee", entity_id=str(employee_id))
        return emp  # type: ignore[return-value]

    async def delete_employee(self, tenant_id: UUID, employee_id: UUID, user_id: UUID) -> None:
        emp = await self.emp_repo.get_by_id(tenant_id, employee_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        emp.deleted_at = datetime.now(UTC)
        emp.status = "Inactive"
        await self.db.commit()
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="delete",
                               entity_type="Employee", entity_id=str(employee_id))


    # -----------------------------------------------------------------------
    # Salary Structure
    # -----------------------------------------------------------------------

    async def set_salary_structure(
        self, tenant_id: UUID, employee_id: UUID, data: SalaryStructureCreate, user_id: UUID
    ) -> SalaryStructure:
        # Close existing active structure (same effective-dating pattern)
        await self.salary_repo.close_current(tenant_id, employee_id, data.effective_from - timedelta(days=1))

        struct = SalaryStructure(
            tenant_id=tenant_id,
            employee_id=employee_id,
            basic=data.basic,
            hra=data.hra,
            other_allowances=data.other_allowances,
            pf_deduction=data.pf_deduction,
            other_deductions=data.other_deductions,
            effective_from=data.effective_from,
        )
        self.db.add(struct)
        await self.db.commit()
        await self.db.refresh(struct)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="create",
                               entity_type="SalaryStructure", entity_id=str(struct.id),
                               details={"employee_id": str(employee_id), "basic": data.basic})
        return struct

    async def get_salary_structures(self, tenant_id: UUID, employee_id: UUID) -> list[SalaryStructure]:
        return list(await self.salary_repo.list_for_employee(tenant_id, employee_id))

    # -----------------------------------------------------------------------
    # Attendance — check-in / check-out
    # -----------------------------------------------------------------------

    def _compute_attendance_status(
        self, check_in_at: datetime, check_out_at: datetime | None, schedule: WorkSchedule
    ) -> tuple[str, int | None]:
        """Return (status, working_minutes)."""
        # Determine if late
        schedule_start = check_in_at.replace(
            hour=schedule.start_time.hour,
            minute=schedule.start_time.minute,
            second=0,
            microsecond=0,
        )
        grace_end = schedule_start + timedelta(minutes=schedule.late_after_minutes)
        is_late = check_in_at > grace_end

        if check_out_at is None:
            return ("LATE" if is_late else "PRESENT"), None

        working_minutes = int((check_out_at - check_in_at).total_seconds() / 60)
        threshold_minutes = schedule.half_day_threshold_hours * 60

        if working_minutes < threshold_minutes:
            return "HALF_DAY", working_minutes
        if is_late:
            return "LATE", working_minutes
        return "PRESENT", working_minutes

    async def check_in(
        self, tenant_id: UUID, data: AttendanceCheckIn, user_id: UUID
    ) -> Attendance:
        target_emp_id = data.employee_id
        if not target_emp_id:
            emp_by_user = await self.emp_repo.get_by_user_id(tenant_id, user_id)
            if not emp_by_user:
                raise HTTPException(status_code=400, detail="Logged-in user is not linked to an active Employee record.")
            target_emp_id = emp_by_user.id

        now = data.check_in_time or datetime.now(UTC)
        today = now.date()
        schedule = await self.ws_repo.get_active(tenant_id, today)
        if not schedule:
            raise HTTPException(status_code=400, detail="No active work schedule configured.")

        is_hol = await self.holiday_repo.is_holiday(tenant_id, today)
        if is_hol or today.weekday() not in _parse_working_day_set(schedule.working_days):
            raise HTTPException(status_code=400, detail="Today is not a working day.")

        existing = await self.att_repo.get_by_employee_date(tenant_id, target_emp_id, today)
        if existing:
            if existing.check_in_at is not None:
                raise HTTPException(status_code=400, detail="Already checked in today.")
            # Row exists (ABSENT/LEAVE from EOD job) — update it
            existing.check_in_at = now
            existing.source = "WEB"
            existing.remarks = data.remarks
            status_val, _ = self._compute_attendance_status(now, None, schedule)
            existing.status = status_val
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        status_val, _ = self._compute_attendance_status(now, None, schedule)
        att = Attendance(
            tenant_id=tenant_id,
            employee_id=target_emp_id,
            attendance_date=today,
            check_in_at=now,
            status=status_val,
            source="WEB",
            remarks=data.remarks,
        )
        self.db.add(att)
        await self.db.commit()
        await self.db.refresh(att)
        return att

    async def check_out(
        self,
        tenant_id: UUID,
        attendance_id: UUID | None = None,
        data: AttendanceCheckOut | None = None,
        user_id: UUID | None = None,
        remarks: str | None = None,
    ) -> Attendance:
        target_att_id = attendance_id
        if not target_att_id:
            if not user_id:
                raise HTTPException(status_code=400, detail="attendance_id or logged-in user required.")
            emp_by_user = await self.emp_repo.get_by_user_id(tenant_id, user_id)
            if not emp_by_user:
                raise HTTPException(status_code=400, detail="Logged-in user is not linked to an active Employee record.")
            today = datetime.now(UTC).date()
            open_att = await self.att_repo.get_by_employee_date(tenant_id, emp_by_user.id, today)
            if not open_att:
                raise HTTPException(status_code=404, detail="No attendance record found for today.")
            target_att_id = open_att.id

        att = await self.att_repo.get_by_id(tenant_id, target_att_id)
        if not att:
            raise HTTPException(status_code=404, detail="Attendance record not found.")
        if not att.check_in_at:
            raise HTTPException(status_code=400, detail="Cannot check out without checking in first.")
        if att.check_out_at:
            raise HTTPException(status_code=400, detail="Already checked out.")

        schedule = await self.ws_repo.get_active(tenant_id, att.attendance_date)
        if not schedule:
            raise HTTPException(status_code=400, detail="No active work schedule found for that date.")

        check_out_dt = (data.check_out_time if data else None) or datetime.now(UTC)
        att.check_out_at = check_out_dt
        if remarks:
            att.remarks = remarks
        elif data and data.remarks:
            att.remarks = data.remarks

        status_val, working_minutes = self._compute_attendance_status(att.check_in_at, check_out_dt, schedule)
        att.status = status_val
        att.working_minutes = working_minutes
        await self.db.commit()
        await self.db.refresh(att)
        return att


    async def manual_correct_attendance(
        self, tenant_id: UUID, attendance_id: UUID, data: AttendanceUpdate, user_id: UUID
    ) -> Attendance:
        att = await self.att_repo.get_by_id(tenant_id, attendance_id)
        if not att:
            raise HTTPException(status_code=404, detail="Attendance record not found.")

        old_values: dict[str, Any] = {}
        for field, value in data.model_dump(exclude_none=True).items():
            old_values[field] = getattr(att, field)
            setattr(att, field, value)

        # Recompute working_minutes if both timestamps are set
        if att.check_in_at and att.check_out_at:
            att.working_minutes = int((att.check_out_at - att.check_in_at).total_seconds() / 60)

        att.source = "MANUAL"
        await self.db.commit()
        await self.db.refresh(att)
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="manual_correct",
            entity_type="Attendance",
            entity_id=str(attendance_id),
            details={"old": old_values, "new": data.model_dump(exclude_none=True)},
        )
        return att

    async def list_attendance(
        self, tenant_id: UUID, employee_id: UUID | None, date_from: date | None, date_to: date | None,
        att_status: str | None, department_id: UUID | None, page: int, limit: int
    ) -> tuple[list[Attendance], int]:
        skip = (page - 1) * limit
        rows, total = await self.att_repo.list_attendance(
            tenant_id, employee_id, date_from, date_to, att_status, department_id, skip, limit
        )
        return list(rows), total

    # -----------------------------------------------------------------------
    # EOD evaluation (scheduled worker callable)
    # -----------------------------------------------------------------------

    async def run_eod_evaluation(self, tenant_id: UUID, eval_date: date) -> dict[str, int]:
        """Mark ABSENT or LEAVE for all active employees who are missing an attendance row."""
        schedule = await self.ws_repo.get_active(tenant_id, eval_date)
        if not schedule:
            return {"skipped": 0, "absent": 0, "leave": 0}

        holidays = await self.holiday_repo.get_holidays_set(tenant_id, eval_date.year, eval_date.month)
        if not is_working_day(eval_date, schedule, holidays):
            return {"skipped": 1, "absent": 0, "leave": 0}

        active_employees = await self.emp_repo.list_active(tenant_id)
        absent_count = leave_count = 0

        for emp in active_employees:
            existing = await self.att_repo.get_by_employee_date(tenant_id, emp.id, eval_date)
            if existing:
                # Row already exists (checked in) — skip
                continue

            approved_leave = await self.lr_repo.get_approved_for_date(tenant_id, emp.id, eval_date)
            att_status = "LEAVE" if approved_leave else "ABSENT"

            att = Attendance(
                tenant_id=tenant_id,
                employee_id=emp.id,
                attendance_date=eval_date,
                status=att_status,
                source="MANUAL",
            )
            self.db.add(att)
            if att_status == "LEAVE":
                leave_count += 1
            else:
                absent_count += 1

        await self.db.commit()
        return {"skipped": 0, "absent": absent_count, "leave": leave_count}

    # -----------------------------------------------------------------------
    # Leave Types
    # -----------------------------------------------------------------------

    async def list_leave_types(self, tenant_id: UUID) -> list[LeaveType]:
        types = await self.lt_repo.list_for_tenant(tenant_id)
        if not types:
            types = await seed_default_leave_types(self.db, tenant_id)
            await self.db.commit()
        return list(types)

    async def create_leave_type(self, tenant_id: UUID, data: LeaveTypeCreate, user_id: UUID) -> LeaveType:
        lt = LeaveType(
            tenant_id=tenant_id,
            name=data.name,
            is_paid=data.is_paid,
            default_annual_days=data.default_annual_days,
        )
        self.db.add(lt)
        await self.db.commit()
        await self.db.refresh(lt)
        return lt

    # -----------------------------------------------------------------------
    # Leave Requests & Balance
    # -----------------------------------------------------------------------

    async def get_employee_leave_balance(
        self, tenant_id: UUID, employee_id: UUID, year: int | None = None
    ) -> list[LeaveBalanceResponse]:
        target_year = year or datetime.now(UTC).year
        types = await self.list_leave_types(tenant_id)
        requests, _ = await self.lr_repo.list_requests(tenant_id, employee_id=employee_id, limit=1000)
        approved_in_year = [
            req for req in requests
            if req.status == "APPROVED" and req.start_date.year == target_year
        ]

        balance_list: list[LeaveBalanceResponse] = []
        for lt in types:
            used_days = 0
            for req in approved_in_year:
                if req.leave_type_id == lt.id:
                    days = (req.end_date - req.start_date).days + 1
                    used_days += max(days, 0)
            remaining_days = max(lt.default_annual_days - used_days, 0)
            balance_list.append(
                LeaveBalanceResponse(
                    leave_type_id=lt.id,
                    leave_type_name=lt.name,
                    is_paid=lt.is_paid,
                    default_annual_days=lt.default_annual_days,
                    used_days=used_days,
                    remaining_days=remaining_days,
                )
            )
        return balance_list

    async def create_leave_request(
        self, tenant_id: UUID, data: LeaveRequestCreate, user_id: UUID
    ) -> LeaveRequest:
        target_emp_id = data.employee_id
        if not target_emp_id:
            emp_by_user = await self.emp_repo.get_by_user_id(tenant_id, user_id)
            if not emp_by_user:
                raise HTTPException(status_code=400, detail="Logged-in user is not linked to an active Employee record.")
            target_emp_id = emp_by_user.id

        emp = await self.emp_repo.get_by_id(tenant_id, target_emp_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        lt = await self.lt_repo.get_by_id(tenant_id, data.leave_type_id)
        if not lt:
            raise HTTPException(status_code=404, detail="Leave type not found")
        if data.end_date < data.start_date:
            raise HTTPException(status_code=400, detail="end_date must be >= start_date")

        lr = LeaveRequest(
            tenant_id=tenant_id,
            employee_id=target_emp_id,
            leave_type_id=data.leave_type_id,
            start_date=data.start_date,
            end_date=data.end_date,
            reason=data.reason,
            status="PENDING",
        )
        self.db.add(lr)
        await self.db.commit()
        lr = await self.lr_repo.get_by_id(tenant_id, lr.id)  # reload with relationships
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="create",
                               entity_type="LeaveRequest", entity_id=str(lr.id))  # type: ignore[union-attr]
        return lr  # type: ignore[return-value]

    async def list_leave_requests(
        self, tenant_id: UUID, employee_id: UUID | None, req_status: str | None, page: int, limit: int
    ) -> tuple[list[LeaveRequest], int]:
        skip = (page - 1) * limit
        rows, total = await self.lr_repo.list_requests(tenant_id, employee_id, req_status, skip, limit)
        return list(rows), total

    async def approve_leave(self, tenant_id: UUID, lr_id: UUID, user_id: UUID) -> LeaveRequest:
        lr = await self.lr_repo.get_by_id(tenant_id, lr_id)
        if not lr:
            raise HTTPException(status_code=404, detail="Leave request not found")
        if lr.status != "PENDING":
            raise HTTPException(status_code=400, detail=f"Cannot approve a {lr.status} request")
        lr.status = "APPROVED"
        lr.approved_by_id = user_id
        lr.approved_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(lr)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="approve",
                               entity_type="LeaveRequest", entity_id=str(lr_id))
        return lr

    async def reject_leave(self, tenant_id: UUID, lr_id: UUID, user_id: UUID) -> LeaveRequest:
        lr = await self.lr_repo.get_by_id(tenant_id, lr_id)
        if not lr:
            raise HTTPException(status_code=404, detail="Leave request not found")
        if lr.status != "PENDING":
            raise HTTPException(status_code=400, detail=f"Cannot reject a {lr.status} request")
        lr.status = "REJECTED"
        lr.approved_by_id = user_id
        lr.approved_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(lr)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="reject",
                               entity_type="LeaveRequest", entity_id=str(lr_id))
        return lr

    # -----------------------------------------------------------------------
    # Salary Advance
    # -----------------------------------------------------------------------

    async def create_salary_advance(
        self, tenant_id: UUID, data: SalaryAdvanceCreate, user_id: UUID
    ) -> tuple[SalaryAdvance, SalaryAdvanceWarning | None]:
        emp = await self.emp_repo.get_by_id(tenant_id, data.employee_id)
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        salary = await self.salary_repo.get_current(tenant_id, data.employee_id)
        gross = float(salary.basic + salary.hra + salary.other_allowances) if salary else 0.0

        existing_total = await self.adv_repo.sum_pending_for_period(
            tenant_id, data.employee_id, data.payroll_period
        )
        projected_net = gross - existing_total - float(data.amount)

        warning: SalaryAdvanceWarning | None = None
        if projected_net < 0:
            warning = SalaryAdvanceWarning(
                would_be_negative=True,
                gross_salary=gross,
                existing_advances=existing_total,
                new_amount=float(data.amount),
                projected_net=projected_net,
                message=(
                    f"This advance of ₹{data.amount:,.0f} would make the net payable "
                    f"₹{projected_net:,.0f} (negative). "
                    "Set confirm=true to save anyway."
                ),
            )
            if not data.confirm:
                # Return warning without saving — caller should re-submit with confirm=True
                # We create a temporary advance object just to package the warning response
                # but do NOT persist it. The API route handles this case.
                return None, warning  # type: ignore[return-value]

        adv = SalaryAdvance(
            tenant_id=tenant_id,
            employee_id=data.employee_id,
            amount=data.amount,
            advance_date=data.advance_date,
            reason=data.reason,
            payroll_period=data.payroll_period,
            status="PENDING",
            created_by_id=user_id,
        )
        self.db.add(adv)
        await self.db.commit()
        adv = await self.adv_repo.get_by_id(tenant_id, adv.id)  # reload
        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="create",
            entity_type="SalaryAdvance",
            entity_id=str(adv.id),  # type: ignore[union-attr]
            details={"amount": float(data.amount), "period": data.payroll_period},
        )
        return adv, warning  # type: ignore[return-value]

    async def list_salary_advances(
        self, tenant_id: UUID, employee_id: UUID | None, payroll_period: str | None, page: int, limit: int
    ) -> tuple[list[SalaryAdvance], int]:
        skip = (page - 1) * limit
        rows, total = await self.adv_repo.list_advances(tenant_id, employee_id, payroll_period, skip, limit)
        return list(rows), total

    async def cancel_salary_advance(self, tenant_id: UUID, adv_id: UUID, user_id: UUID) -> SalaryAdvance:
        adv = await self.adv_repo.get_by_id(tenant_id, adv_id)
        if not adv:
            raise HTTPException(status_code=404, detail="Salary advance not found")
        if adv.status == "ADJUSTED":
            raise HTTPException(
                status_code=400,
                detail="Cannot cancel an advance that has already been adjusted into a payroll run.",
            )
        adv.status = "CANCELLED"
        await self.db.commit()
        await self.db.refresh(adv)
        await log_audit_event(self.db, tenant_id=tenant_id, user_id=user_id, action="cancel",
                               entity_type="SalaryAdvance", entity_id=str(adv_id))
        return adv

    # -----------------------------------------------------------------------
    # Payroll
    # -----------------------------------------------------------------------

    async def run_payroll(self, tenant_id: UUID, payroll_period: str, user_id: UUID) -> Payroll:
        """Generate payroll for a period. Idempotent if already DRAFT — re-run creates fresh."""
        # Parse period
        try:
            year, month = int(payroll_period[:4]), int(payroll_period[5:7])
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="payroll_period must be in format YYYY-MM")

        existing = await self.payroll_repo.get_by_period(tenant_id, payroll_period)
        if existing and existing.status == "PROCESSED":
            raise HTTPException(status_code=400, detail="Payroll for this period is already processed.")

        schedule = await self.ws_repo.get_active(tenant_id)
        if not schedule:
            raise HTTPException(status_code=400, detail="No active work schedule found. Configure one first.")

        working_dates = await compute_working_days_in_month(
            tenant_id, year, month, schedule, self.holiday_repo
        )
        working_days_count = len(working_dates)

        # Create or reuse payroll run
        if not existing:
            payroll = Payroll(
                tenant_id=tenant_id,
                payroll_period=payroll_period,
                status="DRAFT",
            )
            self.db.add(payroll)
            await self.db.flush()
        else:
            payroll = existing

        active_employees = await self.emp_repo.list_active(tenant_id)

        for emp in active_employees:
            salary = await self.salary_repo.get_current(tenant_id, emp.id)
            if not salary:
                continue  # No salary structure — skip this employee

            gross = float(salary.basic + salary.hra + salary.other_allowances)

            # Count unpaid absence days
            month_attendance = await self.att_repo.get_month_statuses(tenant_id, emp.id, year, month)
            att_by_date = {a.attendance_date: a for a in month_attendance}

            unpaid_absence_days = 0
            for d in working_dates:
                att = att_by_date.get(d)
                if att is None or att.status == "ABSENT":
                    unpaid_absence_days += 1
                elif att.status == "LEAVE":
                    leave = await self.lr_repo.get_approved_for_date(tenant_id, emp.id, d)
                    if leave and not leave.leave_type.is_paid:
                        unpaid_absence_days += 1
                elif att.status == "HALF_DAY":
                    unpaid_absence_days += 1  # count as 0.5 day rounds up to 1 for simplicity

            per_day = gross / working_days_count if working_days_count else 0
            unpaid_deduction = round(per_day * unpaid_absence_days, 2)

            # Salary advances
            pending_advances = await self.adv_repo.get_pending_for_period(tenant_id, emp.id, payroll_period)
            advance_total = sum(float(a.amount) for a in pending_advances)

            other_deductions = float(salary.other_deductions)
            net_payable = gross - unpaid_deduction - advance_total - other_deductions

            payslip = Payslip(
                tenant_id=tenant_id,
                payroll_id=payroll.id,
                employee_id=emp.id,
                gross_salary=gross,
                basic=float(salary.basic),
                hra=float(salary.hra),
                other_allowances=float(salary.other_allowances),
                working_days_in_period=working_days_count,
                unpaid_absence_days=unpaid_absence_days,
                unpaid_absence_deduction=unpaid_deduction,
                salary_advance_deduction=advance_total,
                other_deductions=other_deductions,
                net_payable=net_payable,
            )
            self.db.add(payslip)

            # Mark advances as ADJUSTED (snapshot rule)
            for adv in pending_advances:
                adv.status = "ADJUSTED"
                adv.payroll_id = payroll.id

        payroll.status = "PROCESSED"
        payroll.processed_at = datetime.now(UTC)
        payroll.processed_by_id = user_id
        await self.db.commit()
        await self.db.refresh(payroll)

        await log_audit_event(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="run",
            entity_type="Payroll",
            entity_id=str(payroll.id),
            details={"period": payroll_period, "employee_count": len(active_employees)},
        )
        return payroll

    async def list_payrolls(self, tenant_id: UUID, page: int, limit: int) -> tuple[list[Payroll], int]:
        skip = (page - 1) * limit
        rows, total = await self.payroll_repo.list_payrolls(tenant_id, skip, limit)
        return list(rows), total

    async def get_payslips(self, tenant_id: UUID, payroll_id: UUID) -> list[Payslip]:
        payroll = await self.payroll_repo.get_by_id(tenant_id, payroll_id)
        if not payroll:
            raise HTTPException(status_code=404, detail="Payroll not found")
        return list(await self.payslip_repo.list_for_payroll(tenant_id, payroll_id))

    async def get_payslip(self, tenant_id: UUID, payslip_id: UUID) -> Payslip:
        ps = await self.payslip_repo.get_by_id(tenant_id, payslip_id)
        if not ps:
            raise HTTPException(status_code=404, detail="Payslip not found")
        return ps

    # -----------------------------------------------------------------------
    # Employee Self-Service Dashboard & Self Payslips
    # -----------------------------------------------------------------------

    async def get_employee_dashboard(self, tenant_id: UUID, user_id: UUID) -> dict[str, Any]:
        emp = await self.emp_repo.get_by_user_id(tenant_id, user_id)
        if not emp:
            raise HTTPException(
                status_code=400,
                detail="Logged-in user is not linked to an active Employee record.",
            )

        today = datetime.now(UTC).date()
        today_att = await self.att_repo.get_by_employee_date(tenant_id, emp.id, today)

        year, month = today.year, today.month
        month_att = await self.att_repo.get_month_statuses(tenant_id, emp.id, year, month)
        counts = {"present": 0, "late": 0, "half_day": 0, "absent": 0, "leave": 0}
        for a in month_att:
            status_key = a.status.lower()
            if status_key in counts:
                counts[status_key] += 1

        balances = await self.get_employee_leave_balance(tenant_id, emp.id, year)
        pending_leaves, _ = await self.lr_repo.list_requests(
            tenant_id, employee_id=emp.id, status="PENDING", limit=20
        )

        return {
            "employee": emp,
            "today_attendance": today_att,
            "month_summary": counts,
            "leave_balances": balances,
            "pending_leaves": pending_leaves,
        }

    async def get_my_payslips(self, tenant_id: UUID, user_id: UUID) -> list[Payslip]:
        emp = await self.emp_repo.get_by_user_id(tenant_id, user_id)
        if not emp:
            return []
        payslips = await self.payslip_repo.list_for_employee(tenant_id, emp.id)
        return list(payslips)

