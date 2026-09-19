"""HRM Module — Full API routes for /api/v1/hrm/"""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import check_has_hr_access, get_current_tenant, get_current_user, require_permission
from app.core.database import get_db
from app.models.domain import User
from app.schemas.hrm import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceResponse,
    AttendanceUpdate,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    DesignationCreate,
    DesignationResponse,
    DesignationUpdate,
    EmployeeCreate,
    EmployeeDashboardResponse,
    EmployeeProfileUpdate,
    EmployeeResponse,
    EmployeeUpdate,
    HolidayCreate,
    HolidayResponse,
    HolidayUpdate,
    LeaveBalanceResponse,
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveTypeCreate,
    LeaveTypeResponse,
    PaginatedAttendanceResponse,
    PaginatedEmployeesResponse,
    PaginatedLeaveRequestsResponse,
    PaginatedPayrollResponse,
    PayrollResponse,
    PayrollRunRequest,
    PayslipResponse,
    SalaryAdvanceCreate,
    SalaryAdvanceCreateResponse,
    SalaryAdvanceResponse,
    SalaryStructureCreate,
    SalaryStructureResponse,
    SetupLoginRequest,
    WorkScheduleCreate,
    WorkScheduleResponse,
)
from app.services.hrm import HRMService
from app.services.pdf import generate_payslip_pdf_html

router = APIRouter(prefix="/hrm", tags=["hrm"])


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

@router.get("/status")
async def get_hrm_status(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
) -> dict[str, str]:
    return {"module": "hrm", "status": "ready", "tenant_id": str(tenant_id)}


# ---------------------------------------------------------------------------
# Work Schedule
# ---------------------------------------------------------------------------

@router.get(
    "/work-schedule",
    response_model=WorkScheduleResponse | None,
)
async def get_work_schedule(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> WorkScheduleResponse | None:
    service = HRMService(db)
    sched = await service.get_active_schedule(tenant_id)
    if sched is None:
        return None
    return WorkScheduleResponse.model_validate(sched)


@router.put(
    "/work-schedule",
    response_model=WorkScheduleResponse,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def set_work_schedule(
    data: WorkScheduleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> WorkScheduleResponse:
    service = HRMService(db)
    sched = await service.set_work_schedule(tenant_id, data, current_user.id)
    return WorkScheduleResponse.model_validate(sched)


# ---------------------------------------------------------------------------
# Holidays
# ---------------------------------------------------------------------------

@router.get(
    "/holidays",
    response_model=list[HolidayResponse],
)
async def list_holidays(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[HolidayResponse]:
    service = HRMService(db)
    holidays = await service.list_holidays(tenant_id, year)
    return [HolidayResponse.model_validate(h) for h in holidays]


@router.post(
    "/holidays",
    response_model=HolidayResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def create_holiday(
    data: HolidayCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> HolidayResponse:
    service = HRMService(db)
    h = await service.create_holiday(tenant_id, data, current_user.id)
    return HolidayResponse.model_validate(h)


@router.get(
    "/holidays/{holiday_id}",
    response_model=HolidayResponse,
)
async def get_holiday(
    holiday_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> HolidayResponse:
    service = HRMService(db)
    h = await service.get_holiday(tenant_id, holiday_id)
    return HolidayResponse.model_validate(h)


@router.put(
    "/holidays/{holiday_id}",
    response_model=HolidayResponse,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def update_holiday(
    holiday_id: UUID,
    data: HolidayUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> HolidayResponse:
    service = HRMService(db)
    h = await service.update_holiday(tenant_id, holiday_id, data, current_user.id)
    return HolidayResponse.model_validate(h)


@router.delete(
    "/holidays/{holiday_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def delete_holiday(
    holiday_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = HRMService(db)
    await service.delete_holiday(tenant_id, holiday_id, current_user.id)


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------

@router.get(
    "/departments",
    response_model=list[DepartmentResponse],
)
async def list_departments(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[DepartmentResponse]:
    service = HRMService(db)
    depts = await service.list_departments(tenant_id)
    return [DepartmentResponse.model_validate(d) for d in depts]


@router.post(
    "/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def create_department(
    data: DepartmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DepartmentResponse:
    service = HRMService(db)
    dept = await service.create_department(tenant_id, data, current_user.id)
    return DepartmentResponse.model_validate(dept)


@router.put(
    "/departments/{dept_id}",
    response_model=DepartmentResponse,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def update_department(
    dept_id: UUID,
    data: DepartmentUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DepartmentResponse:
    service = HRMService(db)
    dept = await service.update_department(tenant_id, dept_id, data, current_user.id)
    return DepartmentResponse.model_validate(dept)


@router.delete(
    "/departments/{dept_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def delete_department(
    dept_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = HRMService(db)
    await service.delete_department(tenant_id, dept_id, current_user.id)


# ---------------------------------------------------------------------------
# Designations
# ---------------------------------------------------------------------------

@router.get(
    "/designations",
    response_model=list[DesignationResponse],
)
async def list_designations(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[DesignationResponse]:
    service = HRMService(db)
    desigs = await service.list_designations(tenant_id)
    return [DesignationResponse.model_validate(d) for d in desigs]


@router.post(
    "/designations",
    response_model=DesignationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def create_designation(
    data: DesignationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DesignationResponse:
    service = HRMService(db)
    desig = await service.create_designation(tenant_id, data, current_user.id)
    return DesignationResponse.model_validate(desig)


@router.put(
    "/designations/{desig_id}",
    response_model=DesignationResponse,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def update_designation(
    desig_id: UUID,
    data: DesignationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> DesignationResponse:
    service = HRMService(db)
    desig = await service.update_designation(tenant_id, desig_id, data, current_user.id)
    return DesignationResponse.model_validate(desig)


@router.delete(
    "/designations/{desig_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def delete_designation(
    desig_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = HRMService(db)
    await service.delete_designation(tenant_id, desig_id, current_user.id)


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------

@router.get(
    "/employees",
    response_model=PaginatedEmployeesResponse,
)
async def list_employees(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    search: str | None = Query(None),
    department_id: UUID | None = Query(None),
    emp_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> PaginatedEmployeesResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if not linked_emp:
            return PaginatedEmployeesResponse(items=[], total=0, page=page, limit=limit)
        return PaginatedEmployeesResponse(
            items=[EmployeeResponse.model_validate(linked_emp)],
            total=1,
            page=1,
            limit=limit,
        )
    employees, total = await service.list_employees(tenant_id, search, department_id, emp_status, page, limit)
    return PaginatedEmployeesResponse(
        items=[EmployeeResponse.model_validate(e) for e in employees],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/employees",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def create_employee(
    data: EmployeeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeResponse:
    service = HRMService(db)
    emp = await service.create_employee(tenant_id, data, current_user.id)
    return EmployeeResponse.model_validate(emp)


@router.get(
    "/employees/{employee_id}",
    response_model=EmployeeResponse,
)
async def get_employee(
    employee_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if not linked_emp or linked_emp.id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view another employee's profile",
            )
    emp = await service.get_employee(tenant_id, employee_id)
    return EmployeeResponse.model_validate(emp)


@router.put(
    "/employees/{employee_id}",
    response_model=EmployeeResponse,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeResponse:
    service = HRMService(db)
    emp = await service.update_employee(tenant_id, employee_id, data, current_user.id)
    return EmployeeResponse.model_validate(emp)


@router.delete(
    "/employees/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def delete_employee(
    employee_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> None:
    service = HRMService(db)
    await service.delete_employee(tenant_id, employee_id, current_user.id)


@router.post(
    "/employees/{employee_id}/setup-login",
    response_model=EmployeeResponse,
    dependencies=[Depends(require_permission("hrm.employee.edit"))],
)
async def setup_employee_login(
    employee_id: UUID,
    data: SetupLoginRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeResponse:
    service = HRMService(db)
    emp = await service.setup_employee_login(tenant_id, employee_id, data.username, data.password, current_user.id, data.role)
    return EmployeeResponse.model_validate(emp)


@router.post(
    "/employees/{employee_id}/salary-structure",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.payroll.edit"))],
)
async def set_salary_structure(
    employee_id: UUID,
    data: SalaryStructureCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> SalaryStructureResponse:
    service = HRMService(db)
    struct = await service.set_salary_structure(tenant_id, employee_id, data, current_user.id)
    return SalaryStructureResponse.model_validate(struct)


@router.get(
    "/employees/{employee_id}/salary-structure",
    response_model=list[SalaryStructureResponse],
)
async def get_salary_structures(
    employee_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[SalaryStructureResponse]:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if not linked_emp or linked_emp.id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view another employee's salary structure",
            )
    structs = await service.get_salary_structures(tenant_id, employee_id)
    return [SalaryStructureResponse.model_validate(s) for s in structs]


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

@router.post(
    "/attendance/check-in",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def check_in(
    data: AttendanceCheckIn,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> AttendanceResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if linked_emp:
            data.employee_id = linked_emp.id
    att = await service.check_in(tenant_id, data, current_user.id)
    return AttendanceResponse.model_validate(att)


@router.post(
    "/attendance/check-out",
    response_model=AttendanceResponse,
)
async def check_out(
    data: AttendanceCheckOut,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> AttendanceResponse:
    service = HRMService(db)
    att = await service.check_out(tenant_id, data.attendance_id, data, current_user.id, data.remarks)
    return AttendanceResponse.model_validate(att)


@router.get(
    "/attendance",
    response_model=PaginatedAttendanceResponse,
)
async def list_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    employee_id: UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    att_status: str | None = Query(None, alias="status"),
    department_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> PaginatedAttendanceResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        employee_id = linked_emp.id if linked_emp else UUID("00000000-0000-0000-0000-000000000000")
        department_id = None

    records, total = await service.list_attendance(
        tenant_id, employee_id, date_from, date_to, att_status, department_id, page, limit
    )
    return PaginatedAttendanceResponse(
        items=[AttendanceResponse.model_validate(a) for a in records],
        total=total,
        page=page,
        limit=limit,
    )


@router.put(
    "/attendance/{attendance_id}",
    response_model=AttendanceResponse,
    dependencies=[Depends(require_permission("hrm.attendance.edit"))],
)
async def manual_correct_attendance(
    attendance_id: UUID,
    data: AttendanceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> AttendanceResponse:
    service = HRMService(db)
    att = await service.manual_correct_attendance(tenant_id, attendance_id, data, current_user.id)
    return AttendanceResponse.model_validate(att)


# ---------------------------------------------------------------------------
# Leave Types
# ---------------------------------------------------------------------------

@router.get(
    "/leave-types",
    response_model=list[LeaveTypeResponse],
)
async def list_leave_types(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[LeaveTypeResponse]:
    service = HRMService(db)
    types = await service.list_leave_types(tenant_id)
    return [LeaveTypeResponse.model_validate(lt) for lt in types]


@router.post(
    "/leave-types",
    response_model=LeaveTypeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.leave.edit"))],
)
async def create_leave_type(
    data: LeaveTypeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeaveTypeResponse:
    service = HRMService(db)
    lt = await service.create_leave_type(tenant_id, data, current_user.id)
    return LeaveTypeResponse.model_validate(lt)


# ---------------------------------------------------------------------------
# Leave Requests
# ---------------------------------------------------------------------------

@router.post(
    "/leave-requests",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_leave_request(
    data: LeaveRequestCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeaveRequestResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if linked_emp:
            data.employee_id = linked_emp.id
    lr = await service.create_leave_request(tenant_id, data, current_user.id)
    return LeaveRequestResponse.model_validate(lr)


@router.get(
    "/leave-requests",
    response_model=PaginatedLeaveRequestsResponse,
)
async def list_leave_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    employee_id: UUID | None = Query(None),
    req_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> PaginatedLeaveRequestsResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        employee_id = linked_emp.id if linked_emp else UUID("00000000-0000-0000-0000-000000000000")

    requests, total = await service.list_leave_requests(tenant_id, employee_id, req_status, page, limit)
    return PaginatedLeaveRequestsResponse(
        items=[LeaveRequestResponse.model_validate(r) for r in requests],
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/employees/{employee_id}/leave-balance",
    response_model=list[LeaveBalanceResponse],
)
async def get_employee_leave_balance(
    employee_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[LeaveBalanceResponse]:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if not linked_emp or linked_emp.id != employee_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await service.get_employee_leave_balance(tenant_id, employee_id, year)


@router.get(
    "/my-leave-balance",
    response_model=list[LeaveBalanceResponse],
)
async def get_my_leave_balance(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[LeaveBalanceResponse]:
    service = HRMService(db)
    emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
    if not emp:
        return []
    return await service.get_employee_leave_balance(tenant_id, emp.id, year)


@router.put(
    "/leave-requests/{lr_id}/approve",
    response_model=LeaveRequestResponse,
    dependencies=[Depends(require_permission("hrm.leave.edit"))],
)
async def approve_leave_request(
    lr_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeaveRequestResponse:
    service = HRMService(db)
    lr = await service.approve_leave(tenant_id, lr_id, current_user.id)
    return LeaveRequestResponse.model_validate(lr)


@router.put(
    "/leave-requests/{lr_id}/reject",
    response_model=LeaveRequestResponse,
    dependencies=[Depends(require_permission("hrm.leave.edit"))],
)
async def reject_leave_request(
    lr_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> LeaveRequestResponse:
    service = HRMService(db)
    lr = await service.reject_leave(tenant_id, lr_id, current_user.id)
    return LeaveRequestResponse.model_validate(lr)


# ---------------------------------------------------------------------------
# Salary Advances
# ---------------------------------------------------------------------------

@router.post(
    "/salary-advances",
    response_model=SalaryAdvanceCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_salary_advance(
    data: SalaryAdvanceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> SalaryAdvanceCreateResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if linked_emp:
            data.employee_id = linked_emp.id
    adv, warning = await service.create_salary_advance(tenant_id, data, current_user.id)

    if adv is None:
        # Warning-only response (confirm=False and would go negative)
        return SalaryAdvanceCreateResponse(advance=None, warning=warning)  # type: ignore[arg-type]

    return SalaryAdvanceCreateResponse(
        advance=SalaryAdvanceResponse.model_validate(adv),
        warning=warning,
    )


@router.get(
    "/salary-advances",
    response_model=list[SalaryAdvanceResponse],
)
async def list_salary_advances(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    employee_id: UUID | None = Query(None),
    payroll_period: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[SalaryAdvanceResponse]:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        employee_id = linked_emp.id if linked_emp else UUID("00000000-0000-0000-0000-000000000000")

    advances, _ = await service.list_salary_advances(tenant_id, employee_id, payroll_period, page, limit)
    return [SalaryAdvanceResponse.model_validate(a) for a in advances]


@router.put(
    "/salary-advances/{adv_id}/cancel",
    response_model=SalaryAdvanceResponse,
    dependencies=[Depends(require_permission("hrm.advance.edit"))],
)
async def cancel_salary_advance(
    adv_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> SalaryAdvanceResponse:
    service = HRMService(db)
    adv = await service.cancel_salary_advance(tenant_id, adv_id, current_user.id)
    return SalaryAdvanceResponse.model_validate(adv)


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------

@router.post(
    "/payroll/run",
    response_model=PayrollResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("hrm.payroll.edit"))],
)
async def run_payroll(
    data: PayrollRunRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> PayrollResponse:
    service = HRMService(db)
    payroll = await service.run_payroll(tenant_id, data.payroll_period, current_user.id)
    payslips = await service.get_payslips(tenant_id, payroll.id)
    resp = PayrollResponse.model_validate(payroll)
    resp.payslip_count = len(payslips)
    return resp


@router.get(
    "/payroll",
    response_model=PaginatedPayrollResponse,
)
async def list_payrolls(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedPayrollResponse:
    service = HRMService(db)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        return PaginatedPayrollResponse(items=[], total=0, page=page, limit=limit)
    payrolls, total = await service.list_payrolls(tenant_id, page, limit)
    items = []
    for p in payrolls:
        resp = PayrollResponse.model_validate(p)
        try:
            resp.payslip_count = len(p.payslips)
        except Exception:
            resp.payslip_count = 0
        items.append(resp)
    return PaginatedPayrollResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/payroll/{payroll_id}/payslips",
    response_model=list[PayslipResponse],
)
async def get_payslips(
    payroll_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[PayslipResponse]:
    service = HRMService(db)
    payslips = await service.get_payslips(tenant_id, payroll_id)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        emp_id = linked_emp.id if linked_emp else None
        payslips = [ps for ps in payslips if ps.employee_id == emp_id]
    return [PayslipResponse.model_validate(ps) for ps in payslips]


@router.get(
    "/payslips/{payslip_id}/pdf",
)
async def get_payslip_pdf(
    payslip_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    service = HRMService(db)
    payslip = await service.get_payslip(tenant_id, payslip_id)
    has_hr = await check_has_hr_access(current_user, tenant_id, db)
    if not has_hr:
        linked_emp = await service.emp_repo.get_by_user_id(tenant_id, current_user.id)
        if not linked_emp or payslip.employee_id != linked_emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot access another employee's payslip",
            )

    payroll = await service.payroll_repo.get_by_id(tenant_id, payslip.payroll_id)
    period = payroll.payroll_period if payroll else "N/A"
    html = generate_payslip_pdf_html(payslip, payslip.employee, period)
    emp_name = (payslip.employee.name if payslip.employee else "employee").replace(" ", "_")
    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f'inline; filename="payslip_{period}_{emp_name}.html"'},
    )


# ---------------------------------------------------------------------------
# Employee Self-Service Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/me/dashboard",
    response_model=EmployeeDashboardResponse,
)
async def get_my_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeDashboardResponse:
    service = HRMService(db)
    dash_data = await service.get_employee_dashboard(tenant_id, current_user.id)
    return EmployeeDashboardResponse.model_validate(dash_data)


@router.get(
    "/me/payslips",
    response_model=list[PayslipResponse],
)
async def get_my_payslips(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> list[PayslipResponse]:
    service = HRMService(db)
    payslips = await service.get_my_payslips(tenant_id, current_user.id)
    return [PayslipResponse.model_validate(ps) for ps in payslips]


@router.get(
    "/me/profile",
    response_model=EmployeeResponse,
)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeResponse:
    service = HRMService(db)
    emp = await service.get_my_profile(tenant_id, current_user.id)
    return EmployeeResponse.model_validate(emp)


@router.put(
    "/me/profile",
    response_model=EmployeeResponse,
)
async def update_my_profile(
    data: EmployeeProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant)],
    db: AsyncSession = Depends(get_db),
) -> EmployeeResponse:
    service = HRMService(db)
    emp = await service.update_my_profile(tenant_id, current_user.id, data.model_dump(exclude_unset=True))
    return EmployeeResponse.model_validate(emp)

