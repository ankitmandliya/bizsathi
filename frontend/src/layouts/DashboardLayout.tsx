import { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileText,
  HelpCircle,
  IndianRupee,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  UserCheck,
  Users,
  X,
  Megaphone,
  Receipt,
  Package,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { useTheme } from '../context/ThemeContext';
import { hrmApi } from '../features/hrm/services/hrmApi';

const overviewNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
];

const salesNav = [
  { to: '/crm',             label: 'CRM & Deals',     icon: Briefcase },
  { to: '/customers',        label: 'Customers',        icon: Users },
  { to: '/sales/quotations', label: 'Quotations',       icon: FileText },
  { to: '/sales/invoices',   label: 'Invoices',         icon: IndianRupee },
];

const marketingNav = [
  { to: '/marketing',        label: 'Campaigns & Templates', icon: Megaphone },
];

const operationsNav = [
  { to: '/inventory', label: 'Inventory Stock', icon: Package },
  { to: '/expenses',  label: 'Office Expenses', icon: Receipt },
  { to: '/vendors',   label: 'Vendors',         icon: Building2 },
];

const peopleNav = [
  { to: '/hrm/my-dashboard', label: 'My Dashboard',    icon: UserCheck },
  { to: '/hrm/employees',    label: 'Employees',       icon: Users },
  { to: '/hrm/attendance',   label: 'Attendance',      icon: Clock },
  { to: '/hrm/leave',        label: 'Leave',           icon: Calendar },
  { to: '/hrm/advances',     label: 'Salary Advances', icon: IndianRupee },
  { to: '/hrm/payroll',      label: 'Payroll',         icon: FileText },
];

const reportsNav = [
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
];

const settingsNav = [
  { to: '/settings', label: 'Business Settings', icon: SettingsIcon },
];

function NavGroup({
  label,
  items,
  onNavigate,
  isCollapsed = false,
}: {
  label: string;
  items: typeof salesNav;
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  return (
    <div className="nav-section">
      <p className="nav-section-label" title={label}>{label}</p>
      {items.map(({ to, label: itemLabel, icon: Icon }) => (
        <NavLink
          key={itemLabel}
          to={to}
          end={to === '/dashboard' || to === '/crm'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={onNavigate}
          title={isCollapsed ? itemLabel : undefined}
        >
          <Icon size={18} className="nav-item-icon" />
          <span className="nav-item-label">{itemLabel}</span>
          <ChevronRight size={14} className="nav-item-arrow" />
        </NavLink>
      ))}
    </div>
  );
}

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('bizsathi.sidebar_collapsed') === 'true';
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isPlainEmployee, setIsPlainEmployee] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; email?: string; designation?: { name: string } } | null>(null);
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('bizsathi.business_name') || 'BizSathi');

  useEffect(() => {
    const handleUpdate = () => {
      setBusinessName(localStorage.getItem('bizsathi.business_name') || 'BizSathi');
    };
    window.addEventListener('business_name_updated', handleUpdate);
    return () => window.removeEventListener('business_name_updated', handleUpdate);
  }, []);

  useEffect(() => {
    hrmApi.getMyProfile()
      .then(p => setProfile(p))
      .catch(() => { /* silent */ });

    hrmApi.getEmployees({ limit: 2 })
      .then(res => {
        if (res && res.total === 1 && res.items[0]?.email?.toLowerCase() === user?.email?.toLowerCase()) {
          setIsPlainEmployee(true);
        }
      })
      .catch(() => {
        setIsPlainEmployee(true);
      });
  }, [user]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('bizsathi.sidebar_collapsed', String(next));
      return next;
    });
  };

  const displayName = profile?.name || user?.full_name || 'Ramesh Traders';
  const displayEmail = profile?.email || user?.email || 'admin@example.com';
  const displayRole = profile?.designation?.name || (isPlainEmployee ? 'Employee' : 'Owner · Admin');
  const userInitials = getInitials(displayName);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const filteredOverviewNav = isPlainEmployee
    ? [{ to: '/hrm/dashboard', label: 'My Dashboard', icon: UserCheck }]
    : overviewNav;

  const filteredPeopleNav = isPlainEmployee
    ? [
        { to: '/hrm/dashboard', label: 'My Dashboard', icon: UserCheck },
        { to: '/hrm/attendance', label: 'Attendance', icon: Clock },
        { to: '/hrm/leave', label: 'Leave', icon: Calendar },
        { to: '/hrm/advances', label: 'Salary Advances', icon: IndianRupee },
        { to: '/hrm/profile', label: 'My Profile', icon: UserCheck },
      ]
    : [
        ...peopleNav,
        { to: '/hrm/profile', label: 'My Profile', icon: UserCheck },
      ];

  // Mobile Bottom Navigation Items
  const mobileNavItems = isPlainEmployee
    ? [
        { to: '/hrm/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { to: '/hrm/attendance', label: 'Attendance', icon: Clock },
        { to: '/hrm/leave', label: 'Leave', icon: Calendar },
        { to: '/hrm/profile', label: 'Profile', icon: UserCheck },
      ]
    : [
        { to: '/dashboard', label: 'Home', icon: LayoutGrid },
        { to: '/sales/invoices', label: 'Sales', icon: IndianRupee },
        { to: '/inventory', label: 'Stock', icon: Package },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ];

  return (
    <div className="app-shell">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Modern Slide-out / Collapsible Sidebar Drawer */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="brand-block">
          <div className="brand-header">
            <div className="brand-logo-badge">
              <span>{businessName.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="brand-info">
              <div className="brand-title">{businessName}</div>
              <span className="brand-subtitle">Operating Hub</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle sidebar collapse"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={closeSidebar}
              aria-label="Close sidebar drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="sidebar-nav-scroll">
          <NavGroup label="OVERVIEW" items={filteredOverviewNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />
          {!isPlainEmployee && <NavGroup label="SALES & CRM" items={salesNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />}
          {!isPlainEmployee && <NavGroup label="MARKETING" items={marketingNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />}
          {!isPlainEmployee && <NavGroup label="OPERATIONS" items={operationsNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />}
          <NavGroup label="HUMAN RESOURCES" items={filteredPeopleNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />
          {!isPlainEmployee && <NavGroup label="ANALYTICS" items={reportsNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />}
          {!isPlainEmployee && <NavGroup label="SYSTEM SETTINGS" items={settingsNav} onNavigate={closeSidebar} isCollapsed={sidebarCollapsed} />}
        </div>

        {/* Profile Footer Card */}
        <div className="sidebar-profile">
          <div className="user-profile-card" title={sidebarCollapsed ? `${displayName} (${displayRole})` : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className="user-avatar-pill">{userInitials}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{displayRole}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Logout of BizSathi"
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-panel">
        {/* Top Navigation Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <button
              type="button"
              className="topbar-icon-btn mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open side navigation drawer"
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              className="topbar-icon-btn desktop-collapse-btn"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
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
              <Plus size={15} /> <span>Quick Add</span>
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

            <div style={{ position: 'relative' }}>
              <div
                className="avatar-badge"
                title={displayName}
                onClick={() => setProfileMenuOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
              >
                {userInitials}
              </div>

              {profileMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="profile-dropdown-menu">
                    <div className="profile-dropdown-header">
                      <p className="profile-dropdown-name">{displayName}</p>
                      <p className="profile-dropdown-email">{displayEmail}</p>
                      <span className="profile-dropdown-badge">{displayRole}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setProfileMenuOpen(false); navigate('/hrm/profile'); }}
                      className="profile-dropdown-item"
                    >
                      <UserCheck size={15} />
                      My Profile
                    </button>

                    {!isPlainEmployee && (
                      <button
                        type="button"
                        onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }}
                        className="profile-dropdown-item"
                      >
                        <SettingsIcon size={15} />
                        Business Settings
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="profile-dropdown-item logout-item"
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

        {/* Page Content View */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* Pro Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {mobileNavItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <NavLink
              key={label}
              to={to}
              className={`mobile-bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <div className="mobile-nav-icon-wrap">
                <Icon size={19} />
              </div>
              <span className="mobile-nav-label">{label}</span>
            </NavLink>
          );
        })}

        {/* 5th Mobile Bottom Nav Tab: Menu (Drawer Trigger) */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className={`mobile-bottom-nav-item${sidebarOpen ? ' active' : ''}`}
        >
          <div className="mobile-nav-icon-wrap">
            <MoreHorizontal size={19} />
          </div>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </nav>
    </div>
  );
}

