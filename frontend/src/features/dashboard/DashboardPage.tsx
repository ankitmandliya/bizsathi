import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Filter,
  IndianRupee,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  X,
  Receipt,
  UserPlus,
  FileText,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../features/auth/useAuth';
import { getErrorMessage } from '../../utils/error';

interface PerformanceItem {
  day: string;
  date: string;
  revenue: number;
  height: number;
}

interface ActivityItemData {
  id: string;
  text: string;
  time: string;
  color: string;
  category: string;
}

interface DashboardMetrics {
  active_tenants: number;
  active_tenants_trend: string;
  total_revenue: number;
  revenue_trend: string;
  open_tasks: number;
  tasks_trend: string;
  system_health: string;
  system_health_status: string;
  active_leads: number;
  open_deals: number;
  subscriptions: number;
  performance_trend: PerformanceItem[];
  recent_activities: ActivityItemData[];
}

function ReportModal({ isOpen, onClose, metrics }: { isOpen: boolean; onClose: () => void; metrics: DashboardMetrics | null }) {
  const [reportType, setReportType] = useState('summary');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      const csvContent = `Metric,Value\nActive Customers,${metrics?.active_tenants ?? 0}\nTotal Revenue,₹${(metrics?.total_revenue ?? 0).toLocaleString('en-IN')}\nOpen Tasks,${metrics?.open_tasks ?? 0}\nActive Leads,${metrics?.active_leads ?? 0}\nOpen Deals,${metrics?.open_deals ?? 0}\nSubscriptions,${metrics?.subscriptions ?? 0}\nSystem Health,${metrics?.system_health || '100%'}\n`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `BizSathi_Business_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
      onClose();
    }, 600);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: '1px solid var(--line)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--primary)" /> Generate Executive Report
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>Select the metrics report configuration to export workspace analytics.</p>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Report Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setReportType('summary')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: reportType === 'summary' ? '2px solid var(--primary)' : '1px solid var(--line)',
                  background: reportType === 'summary' ? 'var(--primary-dim)' : 'var(--bg-card)',
                  color: reportType === 'summary' ? 'var(--primary)' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <FileSpreadsheet size={16} /> CSV Metrics Export
              </button>
              <button
                type="button"
                onClick={() => setReportType('full')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: reportType === 'full' ? '2px solid var(--primary)' : '1px solid var(--line)',
                  background: reportType === 'full' ? 'var(--primary-dim)' : 'var(--bg-card)',
                  color: reportType === 'full' ? 'var(--primary)' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Download size={16} /> Full Activity Log
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--panel-alt)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--line)', fontSize: 13 }}>
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>Summary Preview</p>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
              • Revenue: ₹{(metrics?.total_revenue ?? 0).toLocaleString('en-IN')}<br />
              • Customers: {metrics?.active_tenants ?? 0}<br />
              • Active Deals: {metrics?.open_deals ?? 0} | Active Leads: {metrics?.active_leads ?? 0}
            </p>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDownload} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: downloading ? 0.7 : 1 }}>
            <Download size={14} /> {downloading ? 'Exporting…' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fetchMetrics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DashboardMetrics>('/api/v1/reports/dashboard');
      setMetrics(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load business dashboard metrics.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getActivityIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'customer': return Building2;
      case 'payroll':
      case 'salaryadvance': return CheckCircle2;
      case 'subscription': return CreditCard;
      case 'lead':
      case 'leaverequest': return Users;
      default: return TrendingUp;
    }
  };

  const currentRevenue = metrics?.total_revenue ?? 0;
  const currentTenants = metrics?.active_tenants ?? 0;
  const currentTasks = metrics?.open_tasks ?? 0;
  const currentLeads = metrics?.active_leads ?? 0;
  const currentDeals = metrics?.open_deals ?? 0;
  const currentSubs = metrics?.subscriptions ?? 0;

  const mainStats = [
    {
      label: 'Customers',
      value: currentTenants.toString(),
      trend: metrics?.active_tenants_trend || 'Active Accounts',
      up: true,
      icon: Building2,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      link: '/customers',
    },
    {
      label: 'Total Revenue',
      value: `₹${currentRevenue.toLocaleString('en-IN')}`,
      trend: metrics?.revenue_trend || 'Gross Revenue',
      up: true,
      icon: IndianRupee,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      link: '/sales/invoices',
    },
    {
      label: 'Open Tasks',
      value: currentTasks.toString(),
      trend: metrics?.tasks_trend || 'Pending Items',
      up: false,
      icon: CheckCircle2,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      link: '/hrm/attendance',
    },
    {
      label: 'Operational Health',
      value: metrics?.system_health || '100%',
      trend: metrics?.system_health_status || 'All modules active',
      up: true,
      icon: Activity,
      iconBg: '#f3e8ff',
      iconColor: '#9333ea',
      link: '/reports',
    },
  ];

  const trendData = metrics?.performance_trend || [
    { day: 'Day 1', date: 'Day 1', revenue: 0, height: 10 },
    { day: 'Day 2', date: 'Day 2', revenue: 0, height: 10 },
    { day: 'Day 3', date: 'Day 3', revenue: 0, height: 10 },
    { day: 'Day 4', date: 'Day 4', revenue: 0, height: 10 },
    { day: 'Day 5', date: 'Day 5', revenue: 0, height: 10 },
  ];

  const activitiesList = metrics?.recent_activities || [];

  const ownerName = user?.full_name || 'Business Owner';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 1240, margin: '0 auto' }}>
      {/* Page Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={18} color="#fff" />
            </div>
            Welcome back, {ownerName}!
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '13.5px' }}>
            Here's what's happening with your business today.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Quick Actions Row */}
          <button
            type="button"
            onClick={() => navigate('/sales/invoices')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: 8, background: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <FileText size={14} /> + Invoice
          </button>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <UserPlus size={14} /> + Customer
          </button>
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Receipt size={14} /> + Expense
          </button>

          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--line)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 10, fontWeight: 700 }}
          >
            <TrendingUp size={15} />
            Create Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 10, padding: '12px 16px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => fetchMetrics()} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Primary Metric Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card"
              onClick={() => navigate(stat.link)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '18px 20px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
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
                {loading ? '…' : stat.value}
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
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Revenue & inquiry conversion trend ({period} days window)</p>
            </div>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: 9999, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
              <TrendingUp size={12} /> +24.6% MoM
            </span>
          </div>

          {/* Dynamic Visual Chart Bar Graph */}
          <div
            style={{
              height: '190px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '24px 8px 0',
              borderBottom: '1px solid var(--line)',
              position: 'relative',
            }}
          >
            {trendData.map((item, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{
                  flex: 1,
                  height: `${item.height}%`,
                  background: hoveredBar === i
                    ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                    : 'linear-gradient(180deg, var(--primary) 0%, rgba(37,99,235,0.45) 100%)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease, background 0.2s ease',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                {hoveredBar === i && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -42,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      zIndex: 10,
                    }}
                  >
                    ₹{item.revenue.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
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
            <span
              onClick={() => navigate('/crm')}
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}
            >
              View All
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activitiesList.map((act) => {
              const ActIcon = getActivityIcon(act.category);
              return (
                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: `${act.color}18`,
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
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {act.text}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', margin: 0 }}>{act.time}</p>
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
          { label: 'Active Leads', value: currentLeads.toString(), icon: Users, color: '#2563eb', link: '/crm' },
          { label: 'Open Deals', value: currentDeals.toString(), icon: BarChart3, color: '#16a34a', link: '/crm' },
          { label: 'Subscriptions', value: currentSubs.toString(), icon: CreditCard, color: '#9333ea', link: '/customers' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="card"
              onClick={() => navigate(item.link)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
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
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: '2px 0 0', letterSpacing: '-0.3px' }}>
                  {loading ? '…' : item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} metrics={metrics} />
    </div>
  );
}
