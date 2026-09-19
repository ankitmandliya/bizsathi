import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EmployeesPage } from '../features/hrm/pages/EmployeesPage';
import { AttendancePage } from '../features/hrm/pages/AttendancePage';

vi.mock('../features/hrm/services/hrmApi', () => ({
  hrmApi: {
    getEmployees: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'emp-1',
          tenant_id: 'tenant-1',
          first_name: 'Rajesh',
          last_name: 'Kumar',
          email: 'rajesh@example.com',
          phone: '9876543210',
          employee_code: 'EMP-001',
          is_active: true,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }),
    getDepartments: vi.fn().mockResolvedValue([]),
    getDesignations: vi.fn().mockResolvedValue([]),
    getAttendance: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
  },
}));

describe('HRM Module Pages', () => {
  it('renders EmployeesPage header and add employee button', async () => {
    render(
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
  });

  it('renders AttendancePage header and clock section', async () => {
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>,
    );

    const headings = screen.getAllByRole('heading', { name: /attendance/i });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
  });
});
