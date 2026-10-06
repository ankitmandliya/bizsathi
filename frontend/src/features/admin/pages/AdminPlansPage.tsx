import React, { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Check, Edit2, Users, Calendar, Search, RefreshCw, X } from 'lucide-react';
import { adminApi, ModuleItem, PlanItem } from '../../../services/api/adminApi';
import { getErrorMessage } from '../../../utils/error';
import { AdminPagination } from '../components/AdminPagination';

export function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLIC' | 'ACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriceMonthly, setFormPriceMonthly] = useState(599);
  const [formPriceYearly, setFormPriceYearly] = useState(5990);
  const [formUserLimit, setFormUserLimit] = useState<string>('5');
  const [formTrialDays, setFormTrialDays] = useState(14);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pData, mData] = await Promise.all([adminApi.getPlans(), adminApi.getModules()]);
      setPlans(pData || []);
      setModules(mData || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter === 'PUBLIC' && !p.is_public) return false;
      if (statusFilter === 'ACTIVE' && !p.is_active) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(q);
        const slugMatch = p.slug.toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        if (!nameMatch && !slugMatch && !descMatch) return false;
      }

      return true;
    });
  }, [plans, statusFilter, search]);

  const total = filteredPlans.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, page, pageSize]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormPriceMonthly(599);
    setFormPriceYearly(5990);
    setFormUserLimit('5');
    setFormTrialDays(14);
    setFormIsActive(true);
    setFormIsPublic(true);
    setSelectedModuleIds(modules.slice(0, 3).map((m) => m.id));
    setShowModal(true);
  };

  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormDesc(plan.description || '');
    setFormPriceMonthly(plan.price_monthly);
    setFormPriceYearly(plan.price_yearly);
    setFormUserLimit(plan.user_limit !== null && plan.user_limit !== undefined ? String(plan.user_limit) : '');
    setFormTrialDays(plan.trial_days);
    setFormIsActive(plan.is_active);
    setFormIsPublic(plan.is_public);
    const incIds = (plan.entitlements || [])
      .filter((e) => e.included)
      .map((e) => e.module_id);
    setSelectedModuleIds(incIds);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const uLimit = formUserLimit.trim() === '' ? undefined : parseInt(formUserLimit, 10);
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, {
          name: formName,
          description: formDesc,
          price_monthly: formPriceMonthly,
          price_yearly: formPriceYearly,
          user_limit: uLimit,
          trial_days: formTrialDays,
          is_active: formIsActive,
          is_public: formIsPublic,
          module_ids: selectedModuleIds,
        });
      } else {
        await adminApi.createPlan({
          name: formName,
          slug: formSlug.toLowerCase().trim(),
          description: formDesc,
          price_monthly: formPriceMonthly,
          price_yearly: formPriceYearly,
          user_limit: uLimit,
          trial_days: formTrialDays,
          is_active: formIsActive,
          is_public: formIsPublic,
          module_ids: selectedModuleIds,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleModuleSelection = (modId: string) => {
    if (selectedModuleIds.includes(modId)) {
      setSelectedModuleIds(selectedModuleIds.filter((id) => id !== modId));
    } else {
      setSelectedModuleIds([...selectedModuleIds, modId]);
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
            Plans & Module Entitlements
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', margin: '4px 0 0 0' }}>
            Configure subscription tiers, monthly/yearly pricing, user limits, and module access control
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
            onClick={handleOpenCreate}
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
            <Plus size={16} />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Filter & Search Controls */}
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>
            Filter:
          </span>
          {[
            { label: 'All Plans', value: 'ALL' },
            { label: 'Public Plans', value: 'PUBLIC' },
            { label: 'Active Only', value: 'ACTIVE' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => { setStatusFilter(tab.value as 'ALL' | 'PUBLIC' | 'ACTIVE'); setPage(1); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-color, #334155)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--input-bg, #0f172a)',
                  color: isSelected ? '#818cf8' : 'var(--muted, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '360px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Search plan name or description..."
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

      {/* Plans Tier Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>Loading plans data...</div>
      ) : paginatedPlans.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted, #94a3b8)', background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
          No plans found matching filter criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {paginatedPlans.map((plan) => {
            const includedMods = (plan.entitlements || []).filter((e) => e.included).map((e) => e.module?.key || e.module_id);
            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #334155)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  position: 'relative',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text, #f8fafc)' }}>{plan.name}</h3>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted, #94a3b8)' }}>{plan.slug}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {plan.is_public ? (
                        <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                          Public
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                          Private
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)', margin: '0 0 16px 0', minHeight: '36px' }}>
                    {plan.description || 'Standard plan tier for business workspace entitlement access.'}
                  </p>

                  <div style={{ background: 'var(--input-bg, #0f172a)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#818cf8' }}>
                      ₹{plan.price_monthly.toLocaleString()}{' '}
                      <span style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)', fontWeight: 500 }}>/ month</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)', marginTop: '2px' }}>
                      ₹{plan.price_yearly.toLocaleString()} / year (Annual billing)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--muted, #94a3b8)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} color="#818cf8" />
                      <span>{plan.user_limit ? `Up to ${plan.user_limit} users` : 'Unlimited users'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="#818cf8" />
                      <span>{plan.trial_days}-day trial</span>
                    </div>
                  </div>

                  {/* Included Modules Checklist */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                      Included Modules ({includedMods.length}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {modules.map((mod) => {
                        const isIncluded = (plan.entitlements || []).some((e) => e.module_id === mod.id && e.included);
                        return (
                          <span
                            key={mod.id}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: isIncluded ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.08)',
                              color: isIncluded ? '#10b981' : '#64748b',
                              border: isIncluded ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isIncluded && <Check size={11} />}
                            {mod.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color, #334155)', paddingTop: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(plan)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--input-bg, #0f172a)',
                      color: 'var(--text, #f8fafc)',
                      border: '1px solid var(--border-color, #334155)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Edit2 size={14} /> Edit Plan & Entitlements
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && paginatedPlans.length > 0 && (
        <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg, #1e293b)', width: '100%', maxWidth: '560px', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text, #f8fafc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#818cf8" /> {editingPlan ? 'Edit Plan Entitlements' : 'Create New Plan'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Plan Name</label>
                  <input type="text" placeholder="e.g. Growth" value={formName} onChange={(e) => setFormName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Slug</label>
                  <input type="text" placeholder="e.g. growth" value={formSlug} onChange={(e) => setFormSlug(e.target.value)} disabled={!!editingPlan} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Description</label>
                <textarea rows={2} placeholder="Summary of tier features..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Monthly Price (₹)</label>
                  <input type="number" min={0} value={formPriceMonthly} onChange={(e) => setFormPriceMonthly(Number(e.target.value))} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Yearly Price (₹)</label>
                  <input type="number" min={0} value={formPriceYearly} onChange={(e) => setFormPriceYearly(Number(e.target.value))} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>User Limit (Empty = Unlimited)</label>
                  <input type="number" min={1} placeholder="Unlimited" value={formUserLimit} onChange={(e) => setFormUserLimit(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Trial Period (Days)</label>
                  <input type="number" min={0} value={formTrialDays} onChange={(e) => setFormTrialDays(Number(e.target.value))} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', margin: '4px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #f8fafc)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} /> Active Plan
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #f8fafc)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formIsPublic} onChange={(e) => setFormIsPublic(e.target.checked)} /> Public Tier (Selectable at signup)
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Module Entitlements:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto', background: 'var(--input-bg, #0f172a)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
                  {modules.map((mod) => (
                    <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text, #f8fafc)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedModuleIds.includes(mod.id)} onChange={() => toggleModuleSelection(mod.id)} />
                      <span>{mod.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
