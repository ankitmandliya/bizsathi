"""HRM Module — SQLAlchemy models.

Scope: Department, Designation, Employee, SalaryStructure, WorkSchedule,
Holiday, LeaveType, LeaveRequest, Attendance, SalaryAdvance, Payroll, Payslip.

Explicitly NOT included: shift management, GPS, biometrics, PF/ESI logic,
loan/EMI, configurable component builder, multi-level approval.
"""

from datetime import date, datetime, time
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


# ---------------------------------------------------------------------------
# Org setup
# ---------------------------------------------------------------------------


class Department(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "departments"
    __table_args__ = (Index("ix_departments_tenant", "tenant_id"),)

    name: Mapped[str] = mapped_column(String(255), nullable=False)


class Designation(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "designations"
    __table_args__ = (Index("ix_designations_tenant", "tenant_id"),)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )


class WorkSchedule(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    """One active schedule per tenant at a time; effective-dated rows."""

    __tablename__ = "work_schedules"
    __table_args__ = (Index("ix_work_schedules_tenant", "tenant_id"),)

    # Comma-separated weekday numbers (0=Mon … 6=Sun), e.g. "0,1,2,3,4"
    working_days: Mapped[str] = mapped_column(String(50), nullable=False, default="0,1,2,3,4")
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    late_after_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    half_day_threshold_hours: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    payday: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # Day of month 1-31

    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)  # null = currently active


class Holiday(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "holidays"
    __table_args__ = (
        Index("ix_holidays_tenant_date", "tenant_id", "holiday_date"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------


class Employee(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "employees"
    __table_args__ = (
        Index("ix_employees_tenant_dept", "tenant_id", "department_id"),
        Index("ix_employees_tenant_status", "tenant_id", "status"),
        Index("ix_employees_tenant_user", "tenant_id", "user_id"),
    )

    user_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    department_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    designation_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("designations.id"), nullable=True
    )

    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_type: Mapped[str] = mapped_column(
        String(50), default="Full-time", nullable=False
    )  # Full-time, Part-time, Contract
    status: Mapped[str] = mapped_column(
        String(50), default="Active", nullable=False
    )  # Active, On Leave, Inactive

    bank_account_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_ifsc: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Storage only — no compliance logic
    pf_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    esi_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    department: Mapped["Department | None"] = relationship("Department", foreign_keys=[department_id])
    designation: Mapped["Designation | None"] = relationship("Designation", foreign_keys=[designation_id])


class SalaryStructure(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    """Effective-dated salary structure rows — never edit history, create new rows."""

    __tablename__ = "salary_structures"
    __table_args__ = (
        Index("ix_salary_structures_tenant_employee", "tenant_id", "employee_id"),
    )

    employee_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("employees.id"), nullable=False
    )

    # Fixed component set for V1
    basic: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    hra: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    other_allowances: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    pf_deduction: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)  # storage only
    other_deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)  # null = currently active


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


class Attendance(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_id", "attendance_date", name="uq_attendance_tenant_emp_date"),
        Index("ix_attendances_tenant_employee", "tenant_id", "employee_id"),
        Index("ix_attendances_tenant_date", "tenant_id", "attendance_date"),
        Index("ix_attendances_tenant_status", "tenant_id", "status"),
    )

    employee_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("employees.id"), nullable=False
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)

    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    working_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)  # computed at checkout

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ABSENT"
    )  # PRESENT, LATE, HALF_DAY, ABSENT, LEAVE
    source: Mapped[str] = mapped_column(String(10), nullable=False, default="MANUAL")  # WEB, MANUAL
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------


class LeaveType(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "leave_types"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_annual_days: Mapped[int] = mapped_column(Integer, default=12, nullable=False)


class LeaveRequest(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "leave_requests"
    __table_args__ = (
        Index("ix_leave_requests_tenant_employee", "tenant_id", "employee_id"),
        Index("ix_leave_requests_tenant_status", "tenant_id", "status"),
    )

    employee_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("employees.id"), nullable=False
    )
    leave_type_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", nullable=False
    )  # PENDING, APPROVED, REJECTED, CANCELLED

    approved_by_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
    leave_type: Mapped["LeaveType"] = relationship("LeaveType", foreign_keys=[leave_type_id])


# ---------------------------------------------------------------------------
# Salary Advance
# ---------------------------------------------------------------------------


class SalaryAdvance(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "salary_advances"
    __table_args__ = (
        Index("ix_salary_advances_tenant_employee", "tenant_id", "employee_id"),
        Index("ix_salary_advances_tenant_period", "tenant_id", "payroll_period"),
    )

    employee_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("employees.id"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    advance_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    payroll_period: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. "2026-09"

    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", nullable=False
    )  # PENDING, ADJUSTED, CANCELLED
    payroll_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("payrolls.id"), nullable=True
    )
    created_by_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------


class Payroll(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "payrolls"
    __table_args__ = (
        Index("ix_payrolls_tenant_period", "tenant_id", "payroll_period", unique=True),
    )

    payroll_period: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. "2026-09"
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", nullable=False)  # DRAFT, PROCESSED

    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_by_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    payslips: Mapped[list["Payslip"]] = relationship("Payslip", back_populates="payroll")

    @property
    def payslip_count(self) -> int:
        try:
            return len(self.payslips) if self.payslips is not None else 0
        except Exception:
            return getattr(self, "_payslip_count", 0)

    @payslip_count.setter
    def payslip_count(self, value: int):
        self._payslip_count = value


class Payslip(Base, UUIDPrimaryKeyMixin, TenantScopedMixin, TimestampMixin):
    __tablename__ = "payslips"
    __table_args__ = (
        Index("ix_payslips_payroll", "payroll_id"),
        Index("ix_payslips_tenant_employee", "tenant_id", "employee_id"),
    )

    payroll_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("payrolls.id"), nullable=False
    )
    employee_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("employees.id"), nullable=False
    )

    # Snapshots (frozen at run time)
    gross_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    basic: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    hra: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    other_allowances: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    working_days_in_period: Mapped[int] = mapped_column(Integer, nullable=False)
    unpaid_absence_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unpaid_absence_deduction: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    salary_advance_deduction: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    other_deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)

    net_payable: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)  # can be negative

    payroll: Mapped["Payroll"] = relationship("Payroll", back_populates="payslips")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
