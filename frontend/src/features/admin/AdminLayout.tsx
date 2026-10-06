import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, LayoutGrid, Building2, FileText, Settings, ArrowLeft, LogOut, Moon, Sun, Package, CreditCard, Receipt, Tag, BarChart2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../../context/ThemeContext';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
    { to: '/admin/plans', label: 'Plans', icon: Package },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { to: '/admin/billing', label: 'Billing', icon: Receipt },
    { to: '/admin/usage', label: 'Usage & Metering', icon: BarChart2 },
    { to: '/admin/coupons', label: 'Coupons', icon: Tag },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { to: '/admin/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="admin-shell" style={{ minHeight: '100vh', background: 'var(--bg, #0f172a)' }}>
      {/* Super Admin Distinct Top Banner */}
      <header
        style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={22} color="#a5b4fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>BizSathi</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: '#6366f1',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  letterSpacing: '0.05em',
                }}
              >
                Super Admin
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#c7d2fe', margin: 0 }}>Platform Administration & Governance</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#e0e7ff',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={15} />
            <span>Switch to Business Workspace</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              padding: '8px',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#f59e0b' }} />}
          </button>

          <div style={{ fontSize: '13px', textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: '#ffffff' }}>{user?.full_name || user?.email}</div>
            <div style={{ fontSize: '11px', color: '#a5b4fc' }}>Platform Administrator</div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#c7d2fe',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Sub Navigation Bar */}
      <nav
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderBottom: '1px solid var(--border-color, #334155)',
          padding: '0 24px',
          display: 'flex',
          gap: '8px',
        }}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `admin-tab-item ${isActive ? 'active' : ''}`
            }
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? '#6366f1' : 'var(--text-muted, #94a3b8)',
              borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.2s',
            })}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Admin Content Area */}
      <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
