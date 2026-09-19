import { useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  HelpCircle,
  IndianRupee,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  UserCheck,
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
  { to: '/crm',             label: 'CRM & Deals',     icon: Briefcase },
  { to: '/customers',        label: 'Customers',        icon: Users },
  { to: '/sales/quotations', label: 'Quotations',       icon: FileText },
  { to: '/sales/invoices',   label: 'Invoices',         icon: DollarSign },
];

const operationsNav = [
  { to: '/vendors',  label: 'Inventory', icon: Building2 },
  { to: '/reports',  label: 'Expenses',  icon: BarChart3 },
];

const peopleNav = [
  { to: '/hrm/my-dashboard', label: 'My Dashboard',    icon: UserCheck },
  { to: '/hrm/employees',    label: 'Employees',       icon: Users },
  { to: '/hrm/attendance',   label: 'Attendance',      icon: Clock },
  { to: '/hrm/leave',        label: 'Leave',           icon: Calendar },
  { to: '/hrm/advances',     label: 'Salary Advances', icon: IndianRupee },
  { to: '/hrm/payroll',      label: 'Payroll',         icon: FileText },
];

const settingsNav = [
  { to: '/settings', label: 'Business Settings', icon: SettingsIcon },
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    setProfileMenuOpen(false);
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
        <NavGroup label="SETTINGS" items={settingsNav} onNavigate={closeSidebar} />

        {/* Profile Card at bottom */}
        <div className="sidebar-profile">
          <div className="user-profile-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar-pill">RT</div>
              <div className="user-info">
                <span className="user-name">Ramesh Traders</span>
                <span className="user-role">Owner · Delhi</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={14} />
              Logout
            </button>
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

            <button
              type="button"
              className="topbar-icon-btn"
              onClick={handleLogout}
              title="Logout of BizSathi"
              aria-label="Logout"
              style={{ color: '#ef4444' }}
            >
              <LogOut size={16} />
            </button>

            <div style={{ position: 'relative' }}>
              <div
                className="avatar-badge"
                title={user?.full_name || 'Ramesh Traders'}
                onClick={() => setProfileMenuOpen(prev => !prev)}
                style={{ cursor: 'pointer' }}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
              >
                RT
              </div>

              {profileMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '240px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--line)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      padding: '12px',
                      zIndex: 50,
                    }}
                  >
                    <div style={{ paddingBottom: '10px', marginBottom: '8px', borderBottom: '1px solid var(--line)' }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: 'var(--text)' }}>
                        {user?.full_name || 'Ramesh Traders'}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                        {user?.email || 'admin@example.com'}
                      </p>
                      <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        Owner · Delhi
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <SettingsIcon size={15} />
                      Business Settings
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '4px',
                      }}
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
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
