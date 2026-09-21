"""HRM Module — Repository layer (thin data-access only, no business logic)."""

from collections.abc import Sequence
from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from app.repositories.base import TenantRepository


# ---------------------------------------------------------------------------
# Org setup repositories
# ---------------------------------------------------------------------------


class DepartmentRepository(TenantRepository[Department]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Department)

    async def get_by_id(self, tenant_id: UUID, dept_id: UUID) -> Department | None:
        res = await self.session.execute(
            select(Department).where(Department.tenant_id == tenant_id, Department.id == dept_id)
        )
        return res.scalar_one_or_none()


class DesignationRepository(TenantRepository[Designation]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Designation)

    async def get_by_id(self, tenant_id: UUID, desig_id: UUID) -> Designation | None:
        res = await self.session.execute(
            select(Designation).where(Designation.tenant_id == tenant_id, Designation.id == desig_id)
        )
        return res.scalar_one_or_none()


class WorkScheduleRepository(TenantRepository[WorkSchedule]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WorkSchedule)

    async def get_active(self, tenant_id: UUID, as_of: date | None = None) -> WorkSchedule | None:
        """Return the schedule whose effective_from <= as_of and effective_to is null or >= as_of."""
        target = as_of or datetime.now(UTC).date()
        res = await self.session.execute(
            select(WorkSchedule)
            .where(
                WorkSchedule.tenant_id == tenant_id,
                WorkSchedule.effective_from <= target,
                or_(WorkSchedule.effective_to.is_(None), WorkSchedule.effective_to >= target),
            )
            .order_by(WorkSchedule.effective_from.desc())
            .limit(1)
        )
        return res.scalar_one_or_none()

    async def close_active(self, tenant_id: UUID, close_date: date) -> None:
        """Set effective_to on the currently active schedule."""
        active = await self.get_active(tenant_id)
        if active:
            active.effective_to = close_date
            await self.session.flush()


class HolidayRepository(TenantRepository[Holiday]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Holiday)

    async def list_for_year(self, tenant_id: UUID, year: int) -> Sequence[Holiday]:
        res = await self.session.scalars(
            select(Holiday)
            .where(
                Holiday.tenant_id == tenant_id,
                func.extract("year", Holiday.holiday_date) == year,
            )
            .order_by(Holiday.holiday_date)
        )
        return res.all()

    async def is_holiday(self, tenant_id: UUID, d: date) -> bool:
        res = await self.session.execute(
            select(func.count()).where(
                Holiday.tenant_id == tenant_id,
                Holiday.holiday_date == d,
            )
        )
        return (res.scalar() or 0) > 0

    async def get_by_id(self, tenant_id: UUID, holiday_id: UUID) -> Holiday | None:
        res = await self.session.execute(
            select(Holiday).where(Holiday.tenant_id == tenant_id, Holiday.id == holiday_id)
        )
        return res.scalar_one_or_none()

    async def get_holidays_set(self, tenant_id: UUID, year: int, month: int) -> set[date]:
        """Return a set of holiday dates for the given year-month."""
        rows = await self.session.scalars(
            select(Holiday.holiday_date).where(
                Holiday.tenant_id == tenant_id,
                func.extract("year", Holiday.holiday_date) == year,
                func.extract("month", Holiday.holiday_date) == month,
            )
        )
        return set(rows.all())


# ---------------------------------------------------------------------------
# Employee & Salary Structure
# ---------------------------------------------------------------------------


class EmployeeRepository(TenantRepository[Employee]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Employee)

    async def get_by_id(self, tenant_id: UUID, employee_id: UUID) -> Employee | None:
        res = await self.session.execute(
            select(Employee)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.designation),
            )
            .where(
                Employee.tenant_id == tenant_id,
                Employee.id == employee_id,
                Employee.deleted_at.is_(None),
            )
        )
        return res.scalars().first()

    async def get_by_user_id(self, tenant_id: UUID, user_id: UUID) -> Employee | None:
        res = await self.session.execute(
            select(Employee)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.designation),
            )
            .where(
                Employee.tenant_id == tenant_id,
                Employee.user_id == user_id,
                Employee.deleted_at.is_(None),
            )
            .order_by(Employee.created_at.asc())
        )
        return res.scalars().first()

    async def get_by_email(self, tenant_id: UUID, email: str) -> Employee | None:
        res = await self.session.execute(
            select(Employee)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.designation),
            )
            .where(
                Employee.tenant_id == tenant_id,
                func.lower(Employee.email) == email.lower(),
                Employee.deleted_at.is_(None),
            )
            .order_by(Employee.created_at.desc())
        )
        return res.scalars().first()


    async def list_employees(
        self,
        tenant_id: UUID,
        search: str | None = None,
        department_id: UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Employee], int]:
        base_q = (
            select(Employee)
            .options(selectinload(Employee.department), selectinload(Employee.designation))
            .where(Employee.tenant_id == tenant_id, Employee.deleted_at.is_(None))
        )
        if search:
            pat = f"%{search}%"
            base_q = base_q.where(
                or_(Employee.name.ilike(pat), Employee.email.ilike(pat), Employee.phone.ilike(pat))
            )
        if department_id:
            base_q = base_q.where(Employee.department_id == department_id)
        if status:
            base_q = base_q.where(Employee.status == status)

        count_q = select(func.count()).select_from(base_q.subquery())
        total_res = await self.session.execute(count_q)
        total = total_res.scalar() or 0

        paged = await self.session.scalars(base_q.order_by(Employee.name).offset(skip).limit(limit))
        return paged.all(), total

    async def list_active(self, tenant_id: UUID) -> Sequence[Employee]:
        res = await self.session.scalars(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.status == "Active",
                Employee.deleted_at.is_(None),
            )
        )
        return res.all()


class SalaryStructureRepository(TenantRepository[SalaryStructure]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SalaryStructure)

    async def get_current(self, tenant_id: UUID, employee_id: UUID, as_of: date | None = None) -> SalaryStructure | None:
        target = as_of or datetime.now(UTC).date()
        res = await self.session.execute(
            select(SalaryStructure)
            .where(
                SalaryStructure.tenant_id == tenant_id,
                SalaryStructure.employee_id == employee_id,
                SalaryStructure.effective_from <= target,
                or_(SalaryStructure.effective_to.is_(None), SalaryStructure.effective_to >= target),
            )
            .order_by(SalaryStructure.effective_from.desc())
            .limit(1)
        )
        return res.scalar_one_or_none()

    async def list_for_employee(self, tenant_id: UUID, employee_id: UUID) -> Sequence[SalaryStructure]:
        res = await self.session.scalars(
            select(SalaryStructure)
            .where(SalaryStructure.tenant_id == tenant_id, SalaryStructure.employee_id == employee_id)
            .order_by(SalaryStructure.effective_from.desc())
        )
        return res.all()

    async def close_current(self, tenant_id: UUID, employee_id: UUID, close_date: date) -> None:
        current = await self.get_current(tenant_id, employee_id)
        if current:
            current.effective_to = close_date
            await self.session.flush()


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


class AttendanceRepository(TenantRepository[Attendance]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Attendance)

    async def get_by_id(self, tenant_id: UUID, attendance_id: UUID) -> Attendance | None:
        res = await self.session.execute(
            select(Attendance)
            .options(
                selectinload(Attendance.employee).selectinload(Employee.department),
                selectinload(Attendance.employee).selectinload(Employee.designation),
            )
            .where(Attendance.tenant_id == tenant_id, Attendance.id == attendance_id)
        )
        return res.scalar_one_or_none()

    async def get_by_employee_date(self, tenant_id: UUID, employee_id: UUID, d: date) -> Attendance | None:
        res = await self.session.execute(
            select(Attendance).where(
                Attendance.tenant_id == tenant_id,
                Attendance.employee_id == employee_id,
                Attendance.attendance_date == d,
            )
        )
        return res.scalar_one_or_none()

    async def list_attendance(
        self,
        tenant_id: UUID,
        employee_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        status: str | None = None,
        department_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Attendance], int]:
        base_q = (
            select(Attendance)
            .options(
                selectinload(Attendance.employee).selectinload(Employee.department),
                selectinload(Attendance.employee).selectinload(Employee.designation),
            )
            .where(Attendance.tenant_id == tenant_id)
        )
        if employee_id:
            base_q = base_q.where(Attendance.employee_id == employee_id)
        if date_from:
            base_q = base_q.where(Attendance.attendance_date >= date_from)
        if date_to:
            base_q = base_q.where(Attendance.attendance_date <= date_to)
        if status:
            base_q = base_q.where(Attendance.status == status)
        if department_id:
            base_q = base_q.join(Employee, Employee.id == Attendance.employee_id).where(
                Employee.department_id == department_id
            )

        count_q = select(func.count()).select_from(base_q.subquery())
        total_res = await self.session.execute(count_q)
        total = total_res.scalar() or 0

        paged = await self.session.scalars(
            base_q.order_by(Attendance.attendance_date.desc()).offset(skip).limit(limit)
        )
        return paged.all(), total

    async def get_month_statuses(
        self, tenant_id: UUID, employee_id: UUID, year: int, month: int
    ) -> Sequence[Attendance]:
        res = await self.session.scalars(
            select(Attendance).where(
                Attendance.tenant_id == tenant_id,
                Attendance.employee_id == employee_id,
                func.extract("year", Attendance.attendance_date) == year,
                func.extract("month", Attendance.attendance_date) == month,
            )
        )
        return res.all()


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------


class LeaveTypeRepository(TenantRepository[LeaveType]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, LeaveType)

    async def get_by_id(self, tenant_id: UUID, lt_id: UUID) -> LeaveType | None:
        res = await self.session.execute(
            select(LeaveType).where(LeaveType.tenant_id == tenant_id, LeaveType.id == lt_id)
        )
        return res.scalar_one_or_none()


class LeaveRequestRepository(TenantRepository[LeaveRequest]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, LeaveRequest)

    async def get_by_id(self, tenant_id: UUID, lr_id: UUID) -> LeaveRequest | None:
        res = await self.session.execute(
            select(LeaveRequest)
            .options(
                selectinload(LeaveRequest.employee).selectinload(Employee.department),
                selectinload(LeaveRequest.employee).selectinload(Employee.designation),
                selectinload(LeaveRequest.leave_type),
            )
            .where(LeaveRequest.tenant_id == tenant_id, LeaveRequest.id == lr_id)
        )
        return res.scalar_one_or_none()

    async def list_requests(
        self,
        tenant_id: UUID,
        employee_id: UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[LeaveRequest], int]:
        base_q = (
            select(LeaveRequest)
            .options(
                selectinload(LeaveRequest.employee).selectinload(Employee.department),
                selectinload(LeaveRequest.employee).selectinload(Employee.designation),
                selectinload(LeaveRequest.leave_type),
            )
            .where(LeaveRequest.tenant_id == tenant_id)
        )
        if employee_id:
            base_q = base_q.where(LeaveRequest.employee_id == employee_id)
        if status:
            base_q = base_q.where(LeaveRequest.status == status)

        count_q = select(func.count()).select_from(base_q.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0
        paged = await self.session.scalars(
            base_q.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit)
        )
        return paged.all(), total

    async def get_approved_for_date(self, tenant_id: UUID, employee_id: UUID, d: date) -> LeaveRequest | None:
        """Find an approved leave that covers a given date."""
        res = await self.session.execute(
            select(LeaveRequest)
            .options(selectinload(LeaveRequest.leave_type))
            .where(
                LeaveRequest.tenant_id == tenant_id,
                LeaveRequest.employee_id == employee_id,
                LeaveRequest.status == "APPROVED",
                LeaveRequest.start_date <= d,
                LeaveRequest.end_date >= d,
            )
        )
        return res.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Salary Advance
# ---------------------------------------------------------------------------


class SalaryAdvanceRepository(TenantRepository[SalaryAdvance]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SalaryAdvance)

    async def get_by_id(self, tenant_id: UUID, adv_id: UUID) -> SalaryAdvance | None:
        res = await self.session.execute(
            select(SalaryAdvance)
            .options(
                selectinload(SalaryAdvance.employee).selectinload(Employee.department),
                selectinload(SalaryAdvance.employee).selectinload(Employee.designation),
            )
            .where(SalaryAdvance.tenant_id == tenant_id, SalaryAdvance.id == adv_id)
        )
        return res.scalar_one_or_none()

    async def list_advances(
        self,
        tenant_id: UUID,
        employee_id: UUID | None = None,
        payroll_period: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[SalaryAdvance], int]:
        base_q = (
            select(SalaryAdvance)
            .options(
                selectinload(SalaryAdvance.employee).selectinload(Employee.department),
                selectinload(SalaryAdvance.employee).selectinload(Employee.designation),
            )
            .where(SalaryAdvance.tenant_id == tenant_id)
        )
        if employee_id:
            base_q = base_q.where(SalaryAdvance.employee_id == employee_id)
        if payroll_period:
            base_q = base_q.where(SalaryAdvance.payroll_period == payroll_period)

        count_q = select(func.count()).select_from(base_q.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0
        paged = await self.session.scalars(
            base_q.order_by(SalaryAdvance.created_at.desc()).offset(skip).limit(limit)
        )
        return paged.all(), total

    async def sum_pending_for_period(
        self, tenant_id: UUID, employee_id: UUID, payroll_period: str
    ) -> float:
        """Sum all PENDING advances for an employee in a given period."""
        res = await self.session.execute(
            select(func.coalesce(func.sum(SalaryAdvance.amount), 0)).where(
                SalaryAdvance.tenant_id == tenant_id,
                SalaryAdvance.employee_id == employee_id,
                SalaryAdvance.payroll_period == payroll_period,
                SalaryAdvance.status == "PENDING",
            )
        )
        return float(res.scalar() or 0)

    async def get_pending_for_period(
        self, tenant_id: UUID, employee_id: UUID, payroll_period: str
    ) -> Sequence[SalaryAdvance]:
        res = await self.session.scalars(
            select(SalaryAdvance).where(
                SalaryAdvance.tenant_id == tenant_id,
                SalaryAdvance.employee_id == employee_id,
                SalaryAdvance.payroll_period == payroll_period,
                SalaryAdvance.status == "PENDING",
            )
        )
        return res.all()


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------


class PayrollRepository(TenantRepository[Payroll]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Payroll)

    async def get_by_id(self, tenant_id: UUID, payroll_id: UUID) -> Payroll | None:
        res = await self.session.execute(
            select(Payroll)
            .options(selectinload(Payroll.payslips))
            .where(Payroll.tenant_id == tenant_id, Payroll.id == payroll_id)
        )
        return res.scalar_one_or_none()

    async def get_by_period(self, tenant_id: UUID, payroll_period: str) -> Payroll | None:
        res = await self.session.execute(
            select(Payroll)
            .options(selectinload(Payroll.payslips))
            .where(
                Payroll.tenant_id == tenant_id,
                Payroll.payroll_period == payroll_period,
            )
        )
        return res.scalar_one_or_none()

    async def list_payrolls(
        self, tenant_id: UUID, skip: int = 0, limit: int = 24
    ) -> tuple[Sequence[Payroll], int]:
        base_q = (
            select(Payroll)
            .options(selectinload(Payroll.payslips))
            .where(Payroll.tenant_id == tenant_id)
        )
        total = (await self.session.execute(select(func.count()).select_from(select(Payroll.id).where(Payroll.tenant_id == tenant_id).subquery()))).scalar() or 0
        paged = await self.session.scalars(
            base_q.order_by(Payroll.payroll_period.desc()).offset(skip).limit(limit)
        )
        return paged.all(), total



class PayslipRepository(TenantRepository[Payslip]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Payslip)

    async def get_by_id(self, tenant_id: UUID, payslip_id: UUID) -> Payslip | None:
        res = await self.session.execute(
            select(Payslip)
            .options(
                selectinload(Payslip.employee).selectinload(Employee.department),
                selectinload(Payslip.employee).selectinload(Employee.designation),
            )
            .where(Payslip.tenant_id == tenant_id, Payslip.id == payslip_id)
        )
        return res.scalar_one_or_none()

    async def list_for_payroll(self, tenant_id: UUID, payroll_id: UUID) -> Sequence[Payslip]:
        res = await self.session.scalars(
            select(Payslip)
            .options(
                selectinload(Payslip.payroll),
                selectinload(Payslip.employee).selectinload(Employee.department),
                selectinload(Payslip.employee).selectinload(Employee.designation),
            )
            .where(Payslip.tenant_id == tenant_id, Payslip.payroll_id == payroll_id)
            .order_by(Payslip.created_at)
        )
        return res.all()

    async def list_for_employee(self, tenant_id: UUID, employee_id: UUID) -> Sequence[Payslip]:
        res = await self.session.scalars(
            select(Payslip)
            .options(
                selectinload(Payslip.payroll),
                selectinload(Payslip.employee).selectinload(Employee.department),
                selectinload(Payslip.employee).selectinload(Employee.designation),
            )
            .where(Payslip.tenant_id == tenant_id, Payslip.employee_id == employee_id)
            .order_by(Payslip.created_at.desc())
        )
        return res.all()

