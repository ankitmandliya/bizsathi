import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoginPage from '../../features/auth/LoginPage';
import DashboardPage from '../../features/dashboard/DashboardPage';
import DocsPage from '../../features/docs/DocsPage';
import { useAuth } from '../../features/auth/useAuth';

import {
  CrmMainPage,
  CustomersListPage,
  DealDetailPage,
  LeadDetailPage,
} from '../../features/crm';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function ModulePlaceholderPage({ name }: { name: string }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold capitalize text-slate-800 dark:text-slate-100">{name} Module</h2>
      <p className="text-sm text-slate-500 mt-2">
        Architecture foundation established. Production business logic ready for implementation phase.
      </p>
    </div>
  );
}

import { InvoicesListPage } from '../../features/sales/pages/InvoicesListPage';
import { InvoiceDetailPage } from '../../features/sales/pages/InvoiceDetailPage';
import { QuotationsListPage } from '../../features/sales/pages/QuotationsListPage';
import { EmployeesPage } from '../../features/hrm/pages/EmployeesPage';
import { AttendancePage } from '../../features/hrm/pages/AttendancePage';
import { LeavePage } from '../../features/hrm/pages/LeavePage';
import { SalaryAdvancePage } from '../../features/hrm/pages/SalaryAdvancePage';
import { PayrollPage } from '../../features/hrm/pages/PayrollPage';
import { EmployeeDashboardPage } from '../../features/hrm/pages/EmployeeDashboardPage';
import { ProfilePage } from '../../features/hrm/pages/ProfilePage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { hrmApi } from '../../features/hrm/services/hrmApi';

import { useState, useEffect } from 'react';

function DynamicDashboardPage() {
  const { user } = useAuth();
  const [isPlainEmployee, setIsPlainEmployee] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    hrmApi.getEmployees({ limit: 2 })
      .then(res => {
        if (res && res.total === 1 && res.items[0]?.email?.toLowerCase() === user?.email?.toLowerCase()) {
          setIsPlainEmployee(true);
        }
      })
      .catch(() => {
        setIsPlainEmployee(true);
      })
      .finally(() => setChecking(false));
  }, [user]);

  if (checking) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading Dashboard…</div>;
  }

  if (isPlainEmployee) {
    return <EmployeeDashboardPage />;
  }

  return <DashboardPage />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DynamicDashboardPage />} />
        <Route path="/crm" element={<CrmMainPage />} />
        <Route path="/crm/leads/:id" element={<LeadDetailPage />} />
        <Route path="/crm/deals/:id" element={<DealDetailPage />} />
        <Route path="/sales" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="/sales/invoices" element={<InvoicesListPage />} />
        <Route path="/sales/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/sales/quotations" element={<QuotationsListPage />} />
        <Route path="/customers" element={<CustomersListPage />} />
        <Route path="/vendors" element={<ModulePlaceholderPage name="Vendors" />} />
        <Route path="/hrm" element={<Navigate to="/hrm/employees" replace />} />
        <Route path="/hrm/employees" element={<EmployeesPage />} />
        <Route path="/hrm/attendance" element={<AttendancePage />} />
        <Route path="/hrm/leave" element={<LeavePage />} />
        <Route path="/hrm/advances" element={<SalaryAdvancePage />} />
        <Route path="/hrm/payroll" element={<PayrollPage />} />
        <Route path="/hrm/dashboard" element={<EmployeeDashboardPage />} />
        <Route path="/hrm/my-dashboard" element={<EmployeeDashboardPage />} />
        <Route path="/hrm/profile" element={<ProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/subscriptions" element={<ModulePlaceholderPage name="Subscriptions" />} />
        <Route path="/reports" element={<ModulePlaceholderPage name="Reports" />} />
        <Route path="/communication" element={<ModulePlaceholderPage name="Communication" />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
