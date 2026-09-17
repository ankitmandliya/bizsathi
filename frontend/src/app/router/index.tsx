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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crm" element={<CrmMainPage />} />
        <Route path="/crm/leads/:id" element={<LeadDetailPage />} />
        <Route path="/crm/deals/:id" element={<DealDetailPage />} />
        <Route path="/sales" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="/sales/invoices" element={<InvoicesListPage />} />
        <Route path="/sales/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/sales/quotations" element={<QuotationsListPage />} />
        <Route path="/customers" element={<CustomersListPage />} />
        <Route path="/vendors" element={<ModulePlaceholderPage name="Vendors" />} />
        <Route path="/hrm" element={<ModulePlaceholderPage name="HRM" />} />
        <Route path="/payroll" element={<ModulePlaceholderPage name="Payroll" />} />
        <Route path="/subscriptions" element={<ModulePlaceholderPage name="Subscriptions" />} />
        <Route path="/reports" element={<ModulePlaceholderPage name="Reports" />} />
        <Route path="/communication" element={<ModulePlaceholderPage name="Communication" />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
