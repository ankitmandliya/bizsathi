import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';

const stats = [
  {
    label: 'Active Tenants',
    value: '24',
    trend: '+3 this month',
    up: true,
    icon: Building2,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
  },
  {
    label: 'Total Revenue',
    value: '₹8,42,000',
    trend: '+12.4% vs last month',
    up: true,
    icon: DollarSign,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
  },
  {
    label: 'Open Tasks',
    value: '128',
    trend: '14 overdue',
    up: false,
    icon: CheckCircle2,
    iconBg: '#fef3c7',
    iconColor: '#d97706',
  },
  {
    label: 'System Health',
    value: '99.9%',
    trend: 'All systems nominal',
    up: true,
    icon: Activity,
    iconBg: '#f3e8ff',
    iconColor: '#9333ea',
  },
];

const activities = [
  { text: 'Customer onboarding completed — Acme Corp', time: '2m ago', color: '#16a34a', icon: Building2 },
  { text: 'Payroll batch queued for review', time: '18m ago', color: '#d97706', icon: CheckCircle2 },
  { text: 'Tenant subscription renewed — Globex Inc', time: '1h ago', color: '#2563eb', icon: CreditCard },
  { text: 'New lead created — Sarah Johnson', time: '2h ago', color: '#9333ea', icon: Users },
  { text: 'Deal closed — Q4 Enterprise License (₹5.4L)', time: '3h ago', color: '#16a34a', icon: TrendingUp },
];

const chartHeights = [40, 65, 80, 55, 95, 70, 85, 100, 65, 85];

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Business Dashboard
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '13.5px' }}>
            Monitor key metrics, performance trends, and real-time workspace activity.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <TrendingUp size={15} />
          Create Report
        </button>
      </div>

      {/* Primary Metric Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '18px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--muted)' }}>{stat.label}</span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: stat.iconBg,
                    color: stat.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ margin: '12px 0 4px', fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: stat.up ? '#16a34a' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {stat.up ? <ArrowUpRight size={14} /> : null}
                {stat.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid: Performance Chart + Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Performance Overview Chart Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Performance Overview</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Revenue & inquiry conversion trend over the last 10 days</p>
            </div>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} /> +24.6% MoM
            </span>
          </div>

          {/* Simulated Visual Chart Bar Graph */}
          <div
            style={{
              height: '180px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '16px 8px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {chartHeights.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background: 'linear-gradient(180deg, var(--primary) 0%, rgba(37,99,235,0.4) 100%)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease',
                }}
                title={`Day ${i + 1}: ${h}% capacity`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
            <span>Day 1</span>
            <span>Day 5</span>
            <span>Day 10 (Today)</span>
          </div>
        </div>

        {/* Recent Activity Timeline Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Recent Activity</h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>View All</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activities.map((act, i) => {
              const ActIcon = act.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: `${act.color}15`,
                      color: act.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ActIcon size={14} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.text}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{act.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Active Leads', value: '47', icon: Users, color: '#2563eb' },
          { label: 'Open Deals', value: '18', icon: BarChart3, color: '#16a34a' },
          { label: 'Subscriptions', value: '9', icon: CreditCard, color: '#9333ea' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: `${item.color}15`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

