import React, { useEffect, useState, useMemo } from 'react';
import { CreditCard, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, XCircle, Edit3, X } from 'lucide-react';
import { adminApi, PlanItem, SubscriptionItem, BusinessListItem } from '../../../services/api/adminApi';
import { getErrorMessage } from '../../../utils/error';
import { AdminPagination } from '../components/AdminPagination';

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Override Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subData, bizData, planData] = await Promise.all([
        adminApi.getSubscriptions(),
        adminApi.getBusinesses({ page_size: 100 }),
        adminApi.getPlans(),
      ]);
      setSubscriptions(subData || []);
      setBusinesses(bizData.items || []);
      setPlans(planData || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const businessMap = useMemo(() => {
    const map = new Map<string, BusinessListItem>();
    businesses.forEach((b) => map.set(b.id, b));
    return map;
  }, [businesses]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // Status Filter
      if (statusFilter !== 'ALL' && sub.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      // Search Filter
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const biz = businessMap.get(sub.tenant_id);
        const bizName = biz?.name?.toLowerCase() || '';
        const ownerEmail = biz?.owner_email?.toLowerCase() || '';
        const planName = sub.plan?.name?.toLowerCase() || '';
        const statusStr = sub.status?.toLowerCase() || '';
        if (!bizName.includes(query) && !ownerEmail.includes(query) && !planName.includes(query) && !statusStr.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [subscriptions, statusFilter, search, businessMap]);

  const total = filteredSubscriptions.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedSubscriptions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubscriptions.slice(start, start + pageSize);
  }, [filteredSubscriptions, page, pageSize]);

  const handleOpenOverride = (sub?: SubscriptionItem) => {
    if (sub) {
      setSelectedTenantId(sub.tenant_id);
      setSelectedPlanId(sub.plan_id);
      setSelectedStatus(sub.status);
      setSelectedCycle(sub.billing_cycle || 'monthly');
    } else {
      setSelectedTenantId(businesses[0]?.id || '');
      setSelectedPlanId(plans[0]?.id || '');
      setSelectedStatus('ACTIVE');
      setSelectedCycle('monthly');
    }
    setShowModal(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !selectedPlanId) return;

    try {
      setSaving(true);
      await adminApi.overrideSubscription({
        tenant_id: selectedTenantId,
        plan_id: selectedPlanId,
        status: selectedStatus,
        billing_cycle: selectedCycle,
      });
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> Active
          </span>
        );
      case 'TRIAL':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> Trial
          </span>
        );
      case 'PAST_DUE':
      case 'GRACE_PERIOD':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={13} /> {statusStr.replace('_', ' ')}
          </span>
        );
      case 'SUSPENDED':
      case 'EXPIRED':
      case 'CANCELLED':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={13} /> {statusStr}
          </span>
        );
      default:
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(148,163,184,0.15)', color: '#94a3b8', fontWeight: 700, fontSize: '12px' }}>
            {statusStr}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)',
          padding: '20px 24px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text, #f8fafc)', letterSpacing: '-0.02em' }}>
            Tenant Subscriptions Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', margin: '4px 0 0 0' }}>
            Monitor tenant subscription lifecycle, status transitions, and perform manual plan/status overrides
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'var(--input-bg, #0f172a)',
              color: 'var(--text, #f8fafc)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenOverride()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Edit3 size={16} />
            <span>Manual Override</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>
            Filter:
          </span>
          {['ALL', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'EXPIRED'].map((st) => {
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => { setStatusFilter(st); setPage(1); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-color, #334155)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--input-bg, #0f172a)',
                  color: isSelected ? '#818cf8' : 'var(--muted, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st.replace('_', ' ')}
              </button>
            );
          })}
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '360px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Search tenant name, owner, plan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '8px 32px 8px 36px',
              background: 'var(--input-bg, #0f172a)',
              color: 'var(--text, #f8fafc)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted, #94a3b8)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  borderBottom: '1px solid var(--border-color, #334155)',
                  color: 'var(--muted, #94a3b8)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '14px 20px' }}>Business Tenant</th>
                <th style={{ padding: '14px 20px' }}>Plan Tier</th>
                <th style={{ padding: '14px 20px' }}>Billing Cycle</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Current Period End</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                    Loading subscriptions data...
                  </td>
                </tr>
              ) : paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                    No subscriptions found matching filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => {
                  const biz = businessMap.get(sub.tenant_id);
                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #334155)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Business Tenant */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text, #f8fafc)', fontSize: '14px' }}>
                          {biz?.name || `Tenant ${sub.tenant_id.slice(0, 8)}`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)' }}>
                          {biz?.owner_email || sub.tenant_id}
                        </div>
                      </td>

                      {/* Plan Tier */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontWeight: 700, color: '#818cf8' }}>
                          {sub.plan?.name || 'Growth Plan'}
                        </span>
                        {sub.user_limit ? (
                          <div style={{ fontSize: '11px', color: 'var(--muted, #94a3b8)' }}>
                            Max {sub.user_limit} users
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--muted, #94a3b8)' }}>Unlimited users</div>
                        )}
                      </td>

                      {/* Billing Cycle */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text, #f8fafc)' }}>
                          {sub.billing_cycle || 'Monthly'}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--muted, #94a3b8)' }}>
                          ₹{sub.billing_cycle === 'yearly' ? sub.plan?.price_yearly || 0 : sub.plan?.price_monthly || 0}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 20px' }}>{getStatusBadge(sub.status)}</td>

                      {/* Current Period End */}
                      <td style={{ padding: '14px 20px', color: 'var(--muted, #94a3b8)', fontSize: '12px' }}>
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'Unlimited / Never'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(sub)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--input-bg, #0f172a)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit3 size={14} /> Override
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        />
      </div>

      {/* Override Subscription Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg, #1e293b)', width: '100%', maxWidth: '480px', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text, #f8fafc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#818cf8" /> Manual Subscription Override
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Target Business Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }}
                >
                  <option value="">-- Select Tenant --</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.owner_email || b.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Assigned Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }}
                >
                  <option value="">-- Select Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price_monthly}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Subscription Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }}
                >
                  {['ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Billing Cycle</label>
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Apply Override'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
