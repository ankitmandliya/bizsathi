import React, { useEffect, useState, useMemo } from 'react';
import { Tag, Plus, Trash2, Edit2, Search, Percent, Calendar } from 'lucide-react';
import { adminApi, CouponItem, PlanItem } from '../../../services/api/adminApi';
import { getErrorMessage } from '../../../utils/error';
import { AdminPagination } from '../components/AdminPagination';

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState('PERCENTAGE');
  const [formDiscountValue, setFormDiscountValue] = useState(20);
  const [formMaxUses, setFormMaxUses] = useState<string>('');
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cData, pData] = await Promise.all([adminApi.getCoupons(), adminApi.getPlans()]);
      setCoupons(cData);
      setPlans(pData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || c.code.toLowerCase().includes(q) || String(c.discount_value).includes(q);
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? c.is_active : !c.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [coupons, search, statusFilter]);

  const totalItems = filteredCoupons.length;
  const paginatedCoupons = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCoupons.slice(start, start + pageSize);
  }, [filteredCoupons, page, pageSize]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDiscountType('PERCENTAGE');
    setFormDiscountValue(20);
    setFormMaxUses('');
    setFormValidFrom('');
    setFormValidUntil('');
    setFormIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (c: CouponItem) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormDiscountType(c.discount_type);
    setFormDiscountValue(c.discount_value);
    setFormMaxUses(c.max_uses !== null && c.max_uses !== undefined ? String(c.max_uses) : '');
    setFormValidFrom(c.valid_from ? c.valid_from.slice(0, 10) : '');
    setFormValidUntil(c.valid_until ? c.valid_until.slice(0, 10) : '');
    setFormIsActive(c.is_active);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const mUses = formMaxUses.trim() === '' ? undefined : parseInt(formMaxUses, 10);
      if (editingCoupon) {
        await adminApi.updateCoupon(editingCoupon.id, {
          discount_type: formDiscountType,
          discount_value: formDiscountValue,
          max_uses: mUses,
          valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : undefined,
          valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : undefined,
          is_active: formIsActive,
        });
      } else {
        await adminApi.createCoupon({
          code: formCode.trim().toUpperCase(),
          discount_type: formDiscountType,
          discount_value: formDiscountValue,
          max_uses: mUses,
          valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : undefined,
          valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : undefined,
          is_active: formIsActive,
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

  const handleDelete = async (couponId: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await adminApi.deleteCoupon(couponId);
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', color: '#818cf8' }}>
              <Tag size={22} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Promo Coupons & Discounts
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Manage promo codes, percentage & flat discounts, and redemption limitations
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
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
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <Plus size={16} />
          <span>Create Coupon</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--card-bg, #1e293b)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: 1,
            minWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg, #0f172a)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #334155)',
          }}
        >
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            placeholder="Search promo code or discount value..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text)',
              width: '100%',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg, #0f172a)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === status ? '#6366f1' : 'transparent',
                color: statusFilter === status ? '#ffffff' : 'var(--muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table Container */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading Promo Coupons…</div>
        ) : paginatedCoupons.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Tag size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No promo coupons found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {search || statusFilter !== 'ALL' ? 'Try adjusting your search filters' : 'Click "Create Coupon" to add your first discount code.'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg, #0f172a)', borderBottom: '1px solid var(--border-color, #334155)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Coupon Code</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Discount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Validity Period</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Redemptions / Limit</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCoupons.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color, #334155)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, color: '#818cf8', fontSize: '15px', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      {c.code}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 10px', borderRadius: '6px' }}>
                      <Percent size={14} />
                      <span>{c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--muted)" />
                      <span>
                        {c.valid_from ? new Date(c.valid_from).toLocaleDateString() : 'Immediate'} to{' '}
                        {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No expiry'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: 'var(--text)', fontWeight: 600 }}>
                    {c.used_count} / {c.max_uses ? c.max_uses : 'Unlimited'}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: c.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: c.is_active ? '#10b981' : '#ef4444',
                      }}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Coupon"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDelete(c.id)}
                        title="Delete Coupon"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!loading && totalItems > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color, #334155)', background: 'var(--bg, #0f172a)' }}>
            <AdminPagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text)' }}>
              {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
            </h2>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!editingCoupon && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BIZFEST50"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Discount Type</label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FLAT">FLAT (₹)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Max Usage Count (Blank = Unlimited)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="e.g. 100"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    marginTop: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Valid From</label>
                  <input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Valid Until</label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                Active Coupon
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#6366f1',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

