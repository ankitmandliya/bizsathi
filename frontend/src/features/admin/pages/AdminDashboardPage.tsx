import { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  TrendingUp,
  Clock,
  Plus,
  IndianRupee,
  CreditCard,
  Package,
  AlertTriangle,
  XCircle,
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  FileText,
} from 'lucide-react';
import { adminApi, type AdminDashboardStats } from '../../../services/api/adminApi';
import { useNavigate } from 'react-router-dom';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    adminApi
      .getDashboardStats()
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load admin stats:', err);
        setError('Failed to load dashboard statistics.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
        <LayoutDashboard size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading Super Admin Dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          borderRadius: '10px',
        }}
      >
        {error}
      </div>
    );
  }

  const revenueCards = [
    {
      title: 'Monthly Recurring Revenue (MRR)',
      value: `₹${(stats?.mrr ?? 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      desc: 'Active subscription recurring value',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.active_count ?? 0,
      icon: CreditCard,
      color: '#818cf8',
      bg: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      desc: 'Tenants with active paid/legacy plans',
    },
    {
      title: 'Active Trials',
      value: stats?.trial_count ?? 0,
      icon: Clock,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      desc: 'Tenants currently in 14-day evaluation trial',
    },
    {
      title: 'Past Due / Grace Period',
      value: (stats?.past_due_count ?? 0) + (stats?.grace_period_count ?? 0),
      icon: AlertTriangle,
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.15)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      desc: 'Awaiting payment (7-day grace period)',
    },
  ];

  const businessCards = [
    {
      title: 'Total Businesses',
      value: stats?.total_businesses ?? 0,
      icon: Building2,
      color: '#c084fc',
      bg: 'rgba(192, 132, 252, 0.12)',
      desc: 'All registered tenant businesses',
    },
    {
      title: 'Active Businesses',
      value: stats?.active_businesses ?? 0,
      icon: CheckCircle2,
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.12)',
      desc: 'Businesses with active platform access',
    },
    {
      title: 'Suspended / Expired',
      value: (stats?.suspended_businesses ?? 0) + (stats?.expired_count ?? 0),
      icon: XCircle,
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.12)',
      desc: 'Access blocked due to non-payment or admin action',
    },
    {
      title: 'New Signups This Month',
      value: stats?.new_this_month ?? 0,
      icon: TrendingUp,
      color: '#22d3ee',
      bg: 'rgba(34, 211, 238, 0.12)',
      desc: 'Signed up in the last 30 days',
    },
  ];

  const quickActions = [
    { label: 'Provision Business', icon: Plus, path: '/admin/businesses', primary: true },
    { label: 'Manage SaaS Plans', icon: Package, path: '/admin/plans' },
    { label: 'Subscriptions', icon: CreditCard, path: '/admin/subscriptions' },
    { label: 'Billing & Payments', icon: Receipt, path: '/admin/billing' },
    { label: 'Platform Audit Logs', icon: FileText, path: '/admin/audit-logs' },
    { label: 'System Settings', icon: ShieldCheck, path: '/admin/settings' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & Quick Launch Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', color: '#818cf8' }}>
              <LayoutDashboard size={22} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Super Admin Overview & Governance
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Real-time platform metrics, SaaS MRR revenue, subscription lifecycles, and tenant controls
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/admin/plans')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--card-bg, #1e293b)',
              color: 'var(--text)',
              border: '1px solid var(--border-color, #334155)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <Package size={16} />
            <span>Manage Plans</span>
          </button>

          <button
            onClick={() => navigate('/admin/businesses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Provision Business</span>
          </button>
        </div>
      </div>

      {/* Revenue & Subscriptions Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            SaaS Revenue & Subscriptions
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '18px',
          }}
        >
          {revenueCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  border: `1px solid ${card.borderColor || 'var(--border-color, #334155)'}`,
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={24} color={card.color} />
                </div>

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                    {card.title}
                  </span>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', margin: '4px 0 2px 0' }}>
                    {card.value}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{card.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Business Tenants Governance Section */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px 0' }}>
          Tenant Governance & Health
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '18px',
          }}
        >
          {businessCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} color={card.color} />
                </div>

                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                    {card.title}
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: '2px 0' }}>
                    {card.value}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{card.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Launch Console Shortcuts */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '14px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text)' }}>
          Super Admin Console Shortcuts
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                onClick={() => navigate(act.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: act.primary ? 'none' : '1px solid var(--border-color, #334155)',
                  background: act.primary ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg, #0f172a)',
                  color: act.primary ? '#818cf8' : 'var(--text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} color={act.primary ? '#818cf8' : 'var(--muted)'} />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

