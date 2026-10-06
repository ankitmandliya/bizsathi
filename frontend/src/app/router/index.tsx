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

import { InvoicesListPage } from '../../features/sales/pages/InvoicesListPage';
import { InvoiceDetailPage } from '../../features/sales/pages/InvoiceDetailPage';
import { QuotationsListPage } from '../../features/sales/pages/QuotationsListPage';
import { QuotationDetailPage } from '../../features/sales/pages/QuotationDetailPage';
import { EmployeesPage } from '../../features/hrm/pages/EmployeesPage';
import { AttendancePage } from '../../features/hrm/pages/AttendancePage';
import { LeavePage } from '../../features/hrm/pages/LeavePage';
import { SalaryAdvancePage } from '../../features/hrm/pages/SalaryAdvancePage';
import { PayrollPage } from '../../features/hrm/pages/PayrollPage';
import { EmployeeDashboardPage } from '../../features/hrm/pages/EmployeeDashboardPage';
import { ProfilePage } from '../../features/hrm/pages/ProfilePage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { MarketingPage } from '../../features/marketing/MarketingPage';
import { ExpensesPage } from '../../features/expenses/ExpensesPage';
import { InventoryPage } from '../../features/inventory/pages/InventoryPage';
import { VendorsPage } from '../../features/vendors/pages/VendorsPage';
import { hrmApi } from '../../features/hrm/services/hrmApi';


import { ReportsPage } from '../../features/reports';

import { useState, useEffect } from 'react';

function DynamicDashboardPage() {
  const { user } = useAuth();
  const [isPlainEmployee, setIsPlainEmployee] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Business Owners & Admins always land on Business Dashboard
    if (user?.is_platform_admin || user?.is_owner || user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
      setIsPlainEmployee(false);
      setChecking(false);
      return;
    }

    hrmApi.getEmployees({ limit: 2 })
      .then(res => {
        if (res && res.total === 1 && res.items[0]?.email?.toLowerCase() === user?.email?.toLowerCase()) {
          setIsPlainEmployee(true);
        } else {
          setIsPlainEmployee(false);
        }
      })
      .catch(() => {
        setIsPlainEmployee(false);
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

import RegisterBusinessPage from '../../features/auth/RegisterBusinessPage';
import CompleteSetupPage from '../../features/auth/CompleteSetupPage';
import { AdminGuard } from '../../features/admin/AdminGuard';
import { AdminLayout } from '../../features/admin/AdminLayout';
import { AdminDashboardPage } from '../../features/admin/pages/AdminDashboardPage';
import { AdminBusinessesPage } from '../../features/admin/pages/AdminBusinessesPage';
import { AdminBusinessDetailPage } from '../../features/admin/pages/AdminBusinessDetailPage';
import { AdminAuditLogsPage } from '../../features/admin/pages/AdminAuditLogsPage';
import { AdminSettingsPage } from '../../features/admin/pages/AdminSettingsPage';

import { AdminPlansPage } from '../../features/admin/pages/AdminPlansPage';
import { AdminSubscriptionsPage } from '../../features/admin/pages/AdminSubscriptionsPage';
import { AdminBillingPage } from '../../features/admin/pages/AdminBillingPage';
import { AdminUsagePage } from '../../features/admin/pages/AdminUsagePage';
import { AdminCouponsPage } from '../../features/admin/pages/AdminCouponsPage';
import { SubscriptionsPage } from '../../features/subscriptions/SubscriptionsPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-business" element={<RegisterBusinessPage />} />
        <Route path="/signup" element={<RegisterBusinessPage />} />
        <Route path="/complete-setup" element={<CompleteSetupPage />} />
      </Route>

      {/* Super Admin Console Routes */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="businesses" element={<AdminBusinessesPage />} />
        <Route path="businesses/:id" element={<AdminBusinessDetailPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
        <Route path="billing" element={<AdminBillingPage />} />
        <Route path="usage" element={<AdminUsagePage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Tenant Workspace Routes */}
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
        <Route path="/sales/quotations/:id" element={<QuotationDetailPage />} />
        <Route path="/customers" element={<CustomersListPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
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
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/categories" element={<ExpensesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />

        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/marketing" element={<MarketingPage />} />
        <Route path="/communication" element={<MarketingPage />} />
        <Route path="/docs" element={<DocsPage />} />

      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
