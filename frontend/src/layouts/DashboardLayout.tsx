import { useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  LayoutGrid,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { useTheme } from '../context/ThemeContext';

const overviewNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
];

const salesNav = [
  { to: '/crm',              label: 'Leads & CRM', icon: Briefcase },
  { to: '/customers',        label: 'Customers',   icon: Users },
  { to: '/sales/quotations', label: 'Sales',       icon: DollarSign },
  { to: '/sales/invoices',   label: 'Invoices',    icon: FileText },
  { to: '/sales/invoices',   label: 'Payments',    icon: CreditCard },
];

const operationsNav = [
  { to: '/vendors',  label: 'Inventory', icon: Building2 },
  { to: '/reports',  label: 'Expenses',  icon: BarChart3 },
];

const peopleNav = [
  { to: '/hrm', label: 'HR & Employees', icon: Users },
];

function NavGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: typeof salesNav;
  onNavigate?: () => void;
}) {
  return (
    <div className="nav-section">
      <p className="nav-section-label">{label}</p>
      {items.map(({ to, label: itemLabel, icon: Icon }) => (
        <NavLink
          key={itemLabel}
          to={to}
          end={to === '/dashboard' || to === '/crm'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          <Icon size={16} />
          <span>{itemLabel}</span>
        </NavLink>
      ))}
    </div>
  );
}

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay)',
            zIndex: 35,
          }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Dark Navy Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="brand-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="brand-title">BizSathi</div>
            <span className="brand-subtitle">Your business, made simple.</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <NavGroup label="OVERVIEW" items={overviewNav} onNavigate={closeSidebar} />
        <NavGroup label="SALES" items={salesNav} onNavigate={closeSidebar} />
        <NavGroup label="OPERATIONS" items={operationsNav} onNavigate={closeSidebar} />
        <NavGroup label="PEOPLE" items={peopleNav} onNavigate={closeSidebar} />

        {/* Profile Card at bottom */}
        <div className="sidebar-profile">
          <div className="user-profile-card" onClick={handleLogout} style={{ cursor: 'pointer' }} title="Click to Logout">
            <div className="user-avatar-pill">RT</div>
            <div className="user-info">
              <span className="user-name">Ramesh Traders</span>
              <span className="user-role">Owner · Delhi</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-panel">
        {/* Top Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <button
              type="button"
              className="topbar-icon-btn mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>

            {/* Global Search Bar */}
            <div className="topbar-search">
              <Search size={15} style={{ color: 'var(--muted)' }} />
              <input placeholder="Search customers, invoices, leads…" />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="topbar-right">
            <button type="button" className="quick-add-btn">
              <Plus size={15} /> Quick Add
            </button>

            {/* Theme Dark / Light Switcher */}
            <button
              type="button"
              className="topbar-icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#f59e0b' }} />}
            </button>

            <button type="button" className="topbar-icon-btn" title="Help & Docs">
              <HelpCircle size={16} />
            </button>

            <button type="button" className="topbar-icon-btn" title="Notifications">
              <Bell size={16} />
              <span className="notification-dot" />
            </button>

            <div className="avatar-badge" title={user?.full_name || 'Ramesh Traders'}>
              RT
            </div>
          </div>
        </header>

        {/* Page View Outlet */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
