"""HRM Module — Pydantic schemas for all request/response types."""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Department & Designation
# ---------------------------------------------------------------------------


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1)


class DepartmentUpdate(BaseModel):
    name: str | None = None


class DepartmentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DesignationCreate(BaseModel):
    name: str = Field(..., min_length=1)
    department_id: UUID | None = None


class DesignationUpdate(BaseModel):
    name: str | None = None
    department_id: UUID | None = None


class DesignationResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    department_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Work Schedule
# ---------------------------------------------------------------------------


class WorkScheduleCreate(BaseModel):
    working_days: str = "0,1,2,3,4"  # Comma-separated weekday numbers 0=Mon
    start_time: time
    end_time: time
    late_after_minutes: int = 15
    half_day_threshold_hours: int = 4
    payday: int = Field(1, ge=1, le=31)
    effective_from: date


class WorkScheduleResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    working_days: str
    start_time: time
    end_time: time
    late_after_minutes: int
    half_day_threshold_hours: int
    payday: int
    effective_from: date
    effective_to: date | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Holiday
# ---------------------------------------------------------------------------


class HolidayCreate(BaseModel):
    name: str = Field(..., min_length=1)
    holiday_date: date


class HolidayUpdate(BaseModel):
    name: str | None = None
    holiday_date: date | None = None


class HolidayResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    holiday_date: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Employee & Login
# ---------------------------------------------------------------------------


class SetupLoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr | None = None
    phone: str | None = None
    photo_url: str | None = None
    user_id: UUID | None = None
    department_id: UUID | None = None
    designation_id: UUID | None = None
    joining_date: date | None = None
    employment_type: str = "Full-time"  # Full-time, Part-time, Contract
    status: str = "Active"
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    pf_number: str | None = None
    esi_number: str | None = None
    give_login_access: bool = False
    username: str | None = None
    password: str | None = None


class EmployeeUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    photo_url: str | None = None
    user_id: UUID | None = None
    department_id: UUID | None = None
    designation_id: UUID | None = None
    joining_date: date | None = None
    employment_type: str | None = None
    status: str | None = None
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    pf_number: str | None = None
    esi_number: str | None = None
    give_login_access: bool | None = None
    username: str | None = None
    password: str | None = None



class EmployeeResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    email: str | None = None
    phone: str | None = None
    photo_url: str | None = None
    user_id: UUID | None = None
    department_id: UUID | None = None
    designation_id: UUID | None = None
    joining_date: date | None = None
    employment_type: str
    status: str
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    pf_number: str | None = None
    esi_number: str | None = None
    department: DepartmentResponse | None = None
    designation: DesignationResponse | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedEmployeesResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# Salary Structure
# ---------------------------------------------------------------------------


class SalaryStructureCreate(BaseModel):
    basic: float = Field(..., ge=0)
    hra: float = Field(0.0, ge=0)
    other_allowances: float = Field(0.0, ge=0)
    pf_deduction: float | None = None
    other_deductions: float = Field(0.0, ge=0)
    effective_from: date


class SalaryStructureResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    employee_id: UUID
    basic: float
    hra: float
    other_allowances: float
    pf_deduction: float | None = None
    other_deductions: float
    effective_from: date
    effective_to: date | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


class AttendanceCheckIn(BaseModel):
    employee_id: UUID | None = None
    check_in_time: datetime | None = None
    remarks: str | None = None



class AttendanceCheckOut(BaseModel):
    attendance_id: UUID | None = None
    check_out_time: datetime | None = None
    remarks: str | None = None


class AttendanceUpdate(BaseModel):
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    status: str | None = None
    remarks: str | None = None


class AttendanceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    employee_id: UUID
    attendance_date: date
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    working_minutes: int | None = None
    status: str
    source: str
    remarks: str | None = None
    employee: EmployeeResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedAttendanceResponse(BaseModel):
    items: list[AttendanceResponse]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------


class LeaveTypeCreate(BaseModel):
    name: str = Field(..., min_length=1)
    is_paid: bool = True
    default_annual_days: int = 12


class LeaveTypeResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    is_paid: bool
    default_annual_days: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaveBalanceResponse(BaseModel):
    leave_type_id: UUID
    leave_type_name: str
    is_paid: bool
    default_annual_days: int
    used_days: int
    remaining_days: int


class LeaveRequestCreate(BaseModel):
    employee_id: UUID | None = None
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: str | None = None



class LeaveRequestResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    employee_id: UUID
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: str | None = None
    status: str
    approved_by_id: UUID | None = None
    approved_at: datetime | None = None
    employee: EmployeeResponse | None = None
    leave_type: LeaveTypeResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedLeaveRequestsResponse(BaseModel):
    items: list[LeaveRequestResponse]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# Salary Advance
# ---------------------------------------------------------------------------


class SalaryAdvanceCreate(BaseModel):
    employee_id: UUID
    amount: float = Field(..., gt=0)
    advance_date: date
    reason: str | None = None
    payroll_period: str  # e.g. "2026-09"
    confirm: bool = False  # Set True to confirm even if net would be negative


class SalaryAdvanceWarning(BaseModel):
    """Returned when the advance would make net_payable negative — does not block."""

    would_be_negative: bool
    gross_salary: float
    existing_advances: float
    new_amount: float
    projected_net: float
    message: str


class SalaryAdvanceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    employee_id: UUID
    amount: float
    advance_date: date
    reason: str | None = None
    payroll_period: str
    status: str
    payroll_id: UUID | None = None
    created_by_id: UUID | None = None
    employee: EmployeeResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalaryAdvanceCreateResponse(BaseModel):
    advance: SalaryAdvanceResponse
    warning: SalaryAdvanceWarning | None = None


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------


class PayrollRunRequest(BaseModel):
    payroll_period: str  # e.g. "2026-09"


class PayrollResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    payroll_period: str
    status: str
    processed_at: datetime | None = None
    processed_by_id: UUID | None = None
    payslip_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayslipResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    payroll_id: UUID
    employee_id: UUID
    gross_salary: float
    basic: float
    hra: float
    other_allowances: float
    working_days_in_period: int
    unpaid_absence_days: int
    unpaid_absence_deduction: float
    salary_advance_deduction: float
    other_deductions: float
    net_payable: float
    employee: EmployeeResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedPayrollResponse(BaseModel):
    items: list[PayrollResponse]
    total: int
    page: int
    limit: int


# ---------------------------------------------------------------------------
# Employee Self-Service Dashboard
# ---------------------------------------------------------------------------


class MonthSummaryResponse(BaseModel):
    present: int = 0
    late: int = 0
    half_day: int = 0
    absent: int = 0
    leave: int = 0


class EmployeeDashboardResponse(BaseModel):
    employee: EmployeeResponse
    today_attendance: AttendanceResponse | None = None
    month_summary: MonthSummaryResponse
    leave_balances: list[LeaveBalanceResponse]
    pending_leaves: list[LeaveRequestResponse]

