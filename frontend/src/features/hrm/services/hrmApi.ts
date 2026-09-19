import apiClient from '../../../services/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Department { id: string; tenant_id: string; name: string; created_at: string; updated_at: string; }
export interface Designation { id: string; tenant_id: string; name: string; department_id?: string; created_at: string; updated_at: string; }
export interface WorkSchedule {
  id: string; tenant_id: string; working_days: string; start_time: string; end_time: string;
  late_after_minutes: number; half_day_threshold_hours: number; payday: number; effective_from: string; effective_to?: string;
}
export interface Holiday { id: string; tenant_id: string; name: string; holiday_date: string; created_at: string; }

export interface LeaveBalance {
  leave_type_id: string; leave_type_name: string; is_paid: boolean;
  default_annual_days: number; used_days: number; remaining_days: number;
}


export interface Employee {
  id: string; tenant_id: string; user_id?: string; name: string; email?: string; phone?: string; photo_url?: string;
  department_id?: string; designation_id?: string; joining_date?: string;
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | string; status: 'Active' | 'On Leave' | 'Inactive' | string;
  bank_account_number?: string; bank_ifsc?: string; emergency_contact_name?: string; emergency_contact_phone?: string;
  pf_number?: string; esi_number?: string;
  department?: Department; designation?: Designation;
  created_at: string; updated_at: string; deleted_at?: string;
}

export interface SalaryStructure {
  id: string; tenant_id: string; employee_id: string; basic: number; hra: number; other_allowances: number;
  pf_deduction?: number; other_deductions: number; effective_from: string; effective_to?: string;
}

export interface Attendance {
  id: string; tenant_id: string; employee_id: string; attendance_date: string;
  check_in_at?: string; check_out_at?: string; working_minutes?: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE' | string;
  source: 'WEB' | 'MANUAL' | string; remarks?: string; employee?: Employee;
  created_at: string; updated_at: string;
}

export interface LeaveType { id: string; tenant_id: string; name: string; is_paid: boolean; default_annual_days: number; }

export interface LeaveRequest {
  id: string; tenant_id: string; employee_id: string; leave_type_id: string;
  start_date: string; end_date: string; reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  approved_by_id?: string; approved_at?: string;
  employee?: Employee; leave_type?: LeaveType; created_at: string; updated_at: string;
}

export interface SalaryAdvance {
  id: string; tenant_id: string; employee_id: string; amount: number; advance_date: string;
  reason?: string; payroll_period: string; status: 'PENDING' | 'ADJUSTED' | 'CANCELLED' | string;
  payroll_id?: string; created_by_id?: string; employee?: Employee; created_at: string;
}

export interface SalaryAdvanceWarning {
  would_be_negative: boolean; gross_salary: number; existing_advances: number;
  new_amount: number; projected_net: number; message: string;
}

export interface SalaryAdvanceCreateResponse { advance?: SalaryAdvance; warning?: SalaryAdvanceWarning; }

export interface Payroll {
  id: string; tenant_id: string; payroll_period: string; status: 'DRAFT' | 'PROCESSED' | string;
  processed_at?: string; processed_by_id?: string; payslip_count: number; created_at: string;
}

export interface Payslip {
  id: string; tenant_id: string; payroll_id: string; employee_id: string;
  gross_salary: number; basic: number; hra: number; other_allowances: number;
  working_days_in_period: number; unpaid_absence_days: number; unpaid_absence_deduction: number;
  salary_advance_deduction: number; other_deductions: number; net_payable: number;
  employee?: Employee; created_at: string;
}

export interface MonthSummary {
  present: number;
  late: number;
  half_day: number;
  absent: number;
  leave: number;
}

export interface EmployeeDashboardData {
  employee: Employee;
  today_attendance?: Attendance;
  month_summary: MonthSummary;
  leave_balances: LeaveBalance[];
  pending_leaves: LeaveRequest[];
}

export interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; }

// ─── API ─────────────────────────────────────────────────────────────────────

export const hrmApi = {
  // Work Schedule
  getWorkSchedule: () => apiClient.get<WorkSchedule | null>('/api/v1/hrm/work-schedule').then(r => r.data),
  setWorkSchedule: (data: Partial<WorkSchedule>) => apiClient.put<WorkSchedule>('/api/v1/hrm/work-schedule', data).then(r => r.data),

  // Holidays
  getHolidays: (year?: number) => apiClient.get<Holiday[]>('/api/v1/hrm/holidays', { params: { year } }).then(r => r.data),
  createHoliday: (data: { name: string; holiday_date: string }) => apiClient.post<Holiday>('/api/v1/hrm/holidays', data).then(r => r.data),
  updateHoliday: (id: string, data: { name?: string; holiday_date?: string }) => apiClient.put<Holiday>(`/api/v1/hrm/holidays/${id}`, data).then(r => r.data),
  deleteHoliday: (id: string) => apiClient.delete(`/api/v1/hrm/holidays/${id}`),

  // Departments
  getDepartments: () => apiClient.get<Department[]>('/api/v1/hrm/departments').then(r => r.data),
  createDepartment: (name: string) => apiClient.post<Department>('/api/v1/hrm/departments', { name }).then(r => r.data),
  updateDepartment: (id: string, name: string) => apiClient.put<Department>(`/api/v1/hrm/departments/${id}`, { name }).then(r => r.data),
  deleteDepartment: (id: string) => apiClient.delete(`/api/v1/hrm/departments/${id}`),

  // Designations
  getDesignations: () => apiClient.get<Designation[]>('/api/v1/hrm/designations').then(r => r.data),
  createDesignation: (data: { name: string; department_id?: string }) => apiClient.post<Designation>('/api/v1/hrm/designations', data).then(r => r.data),

  // Employees
  getEmployees: (params?: { search?: string; department_id?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Employee>>('/api/v1/hrm/employees', { params }).then(r => r.data),
  getEmployee: (id: string) => apiClient.get<Employee>(`/api/v1/hrm/employees/${id}`).then(r => r.data),
  createEmployee: (data: Partial<Employee> & { give_login_access?: boolean; username?: string; password?: string }) =>
    apiClient.post<Employee>('/api/v1/hrm/employees', data).then(r => r.data),
  updateEmployee: (id: string, data: Partial<Employee> & { give_login_access?: boolean; username?: string; password?: string }) =>
    apiClient.put<Employee>(`/api/v1/hrm/employees/${id}`, data).then(r => r.data),
  deleteEmployee: (id: string) => apiClient.delete(`/api/v1/hrm/employees/${id}`),
  setupLogin: (employeeId: string, username: string, password: string) =>
    apiClient.post<Employee>(`/api/v1/hrm/employees/${employeeId}/setup-login`, { username, password }).then(r => r.data),

  // Salary Structure
  getSalaryStructures: (employeeId: string) => apiClient.get<SalaryStructure[]>(`/api/v1/hrm/employees/${employeeId}/salary-structure`).then(r => r.data),
  setSalaryStructure: (employeeId: string, data: Partial<SalaryStructure>) =>
    apiClient.post<SalaryStructure>(`/api/v1/hrm/employees/${employeeId}/salary-structure`, data).then(r => r.data),

  // Attendance
  checkIn: (employee_id?: string, remarks?: string) => apiClient.post<Attendance>('/api/v1/hrm/attendance/check-in', { employee_id, remarks }).then(r => r.data),
  checkOut: (attendance_id?: string, remarks?: string) => apiClient.post<Attendance>('/api/v1/hrm/attendance/check-out', { attendance_id, remarks }).then(r => r.data),
  getAttendance: (params?: { employee_id?: string; date_from?: string; date_to?: string; status?: string; department_id?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Attendance>>('/api/v1/hrm/attendance', { params }).then(r => r.data),
  updateAttendance: (id: string, data: Partial<Attendance>) => apiClient.put<Attendance>(`/api/v1/hrm/attendance/${id}`, data).then(r => r.data),

  // Leave Types
  getLeaveTypes: () => apiClient.get<LeaveType[]>('/api/v1/hrm/leave-types').then(r => r.data),
  createLeaveType: (data: Partial<LeaveType>) => apiClient.post<LeaveType>('/api/v1/hrm/leave-types', data).then(r => r.data),

  // Leave Requests & Balance
  getLeaveRequests: (params?: { employee_id?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<LeaveRequest>>('/api/v1/hrm/leave-requests', { params }).then(r => r.data),
  createLeaveRequest: (data: Partial<LeaveRequest>) => apiClient.post<LeaveRequest>('/api/v1/hrm/leave-requests', data).then(r => r.data),
  approveLeave: (id: string) => apiClient.put<LeaveRequest>(`/api/v1/hrm/leave-requests/${id}/approve`).then(r => r.data),
  rejectLeave: (id: string) => apiClient.put<LeaveRequest>(`/api/v1/hrm/leave-requests/${id}/reject`).then(r => r.data),
  getLeaveBalance: (employeeId: string, year?: number) =>
    apiClient.get<LeaveBalance[]>(`/api/v1/hrm/employees/${employeeId}/leave-balance`, { params: { year } }).then(r => r.data),
  getMyLeaveBalance: (year?: number) =>
    apiClient.get<LeaveBalance[]>('/api/v1/hrm/my-leave-balance', { params: { year } }).then(r => r.data),

  // Salary Advances
  getSalaryAdvances: (params?: { employee_id?: string; payroll_period?: string; page?: number }) =>
    apiClient.get<SalaryAdvance[]>('/api/v1/hrm/salary-advances', { params }).then(r => r.data),
  createSalaryAdvance: (data: Partial<SalaryAdvance> & { confirm?: boolean }) =>
    apiClient.post<SalaryAdvanceCreateResponse>('/api/v1/hrm/salary-advances', data).then(r => r.data),
  cancelSalaryAdvance: (id: string) => apiClient.put<SalaryAdvance>(`/api/v1/hrm/salary-advances/${id}/cancel`).then(r => r.data),

  // Payroll & Self-Service
  runPayroll: (payroll_period: string) => apiClient.post<Payroll>('/api/v1/hrm/payroll/run', { payroll_period }).then(r => r.data),
  getPayrolls: (params?: { page?: number; limit?: number }) => apiClient.get<PaginatedResponse<Payroll>>('/api/v1/hrm/payroll', { params }).then(r => r.data),
  getPayslips: (payrollId: string) => apiClient.get<Payslip[]>(`/api/v1/hrm/payroll/${payrollId}/payslips`).then(r => r.data),
  getPayslipPdfUrl: (payslipId: string) => `/api/v1/hrm/payslips/${payslipId}/pdf`,
  getMyDashboard: () => apiClient.get<EmployeeDashboardData>('/api/v1/hrm/me/dashboard').then(r => r.data),
  getMyPayslips: () => apiClient.get<Payslip[]>('/api/v1/hrm/me/payslips').then(r => r.data),
};

