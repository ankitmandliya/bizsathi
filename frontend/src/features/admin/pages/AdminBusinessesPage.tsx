import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Building2, AlertOctagon, CheckCircle2, X, Eye, RefreshCw } from 'lucide-react';
import { adminApi, type BusinessListItem } from '../../../services/api/adminApi';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../../utils/error';
import { AdminPagination } from '../components/AdminPagination';

export function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [provisionName, setProvisionName] = useState('');
  const [provisionOwnerName, setProvisionOwnerName] = useState('');
  const [provisionOwnerEmail, setProvisionOwnerEmail] = useState('');
  const [provisionSubmitting, setProvisionSubmitting] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const [suspendModalBiz, setSuspendModalBiz] = useState<BusinessListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendSubmitting, setSuspendSubmitting] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchBusinesses = useCallback(() => {
    setLoading(true);
    adminApi.getBusinesses({
      page,
      page_size: pageSize,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
    })
      .then((res) => {
        setBusinesses(res.items || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch businesses:', err);
        setLoading(false);
      });
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    if (!provisionName.trim() || !provisionOwnerName.trim() || !provisionOwnerEmail.trim()) {
      setProvisionError('All fields are required.');
      return;
    }

    setProvisionSubmitting(true);
    try {
      await adminApi.createProvisionedBusiness({
        name: provisionName.trim(),
        owner_name: provisionOwnerName.trim(),
        owner_email: provisionOwnerEmail.trim(),
      });
      setProvisionModalOpen(false);
      setProvisionName('');
      setProvisionOwnerName('');
      setProvisionOwnerEmail('');
      fetchBusinesses();
    } catch (err: unknown) {
      setProvisionError(getErrorMessage(err, 'Failed to provision business.'));
    } finally {
      setProvisionSubmitting(false);
    }
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalBiz) return;
    setSuspendError(null);
    if (!suspendReason.trim()) {
      setSuspendError('Reason for suspension is required.');
      return;
    }

    setSuspendSubmitting(true);
    try {
      await adminApi.suspendBusiness(suspendModalBiz.id, suspendReason.trim());
      setSuspendModalBiz(null);
      setSuspendReason('');
      fetchBusinesses();
    } catch (err: unknown) {
      setSuspendError(getErrorMessage(err, 'Failed to suspend business.'));
    } finally {
      setSuspendSubmitting(false);
    }
  };

  const handleReactivate = async (biz: BusinessListItem) => {
    try {
      await adminApi.reactivateBusiness(biz.id);
      fetchBusinesses();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to reactivate business.'));
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

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
            Businesses Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', margin: '4px 0 0 0' }}>
            Manage platform tenants, monitor subscriptions, provision accounts, and control operational status
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchBusinesses}
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
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setProvisionModalOpen(true)}
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
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={16} />
            <span>Provision New Business</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar Card */}
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>
            Status:
          </span>
          {[
            { label: 'All Businesses', value: '' },
            { label: 'Active', value: 'Active' },
            { label: 'Suspended', value: 'Suspended' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => handleStatusFilterChange(tab.value)}
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
        <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Search business name, owner or email..."
            value={search}
            onChange={handleSearchChange}
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
                <th style={{ padding: '14px 20px' }}>Business / Slug</th>
                <th style={{ padding: '14px 20px' }}>Owner Info</th>
                <th style={{ padding: '14px 20px' }}>Current Plan</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Created Date</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                    Loading business records...
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                    No businesses found matching your criteria.
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => (
                  <tr
                    key={biz.id}
                    style={{
                      borderBottom: '1px solid var(--border-color, #334155)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Business / Slug */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text, #f8fafc)', fontSize: '14px' }}>{biz.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)', fontFamily: 'monospace' }}>{biz.slug}</div>
                    </td>

                    {/* Owner Info */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text, #f8fafc)' }}>{biz.owner_name || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)' }}>{biz.owner_email || '—'}</div>
                      {biz.setup_pending && (
                        <span style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          Setup Pending
                        </span>
                      )}
                    </td>

                    {/* Current Plan */}
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(99,102,241,0.15)',
                          color: '#818cf8',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {biz.current_plan_name || 'Growth'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px' }}>
                      {biz.status === 'Active' ? (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: 'rgba(16,185,129,0.15)',
                            color: '#10b981',
                            fontWeight: 700,
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={13} /> Active
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: 'rgba(239,68,68,0.15)',
                            color: '#ef4444',
                            fontWeight: 700,
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title={biz.suspended_reason || 'Suspended'}
                        >
                          <AlertOctagon size={13} /> Suspended
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td style={{ padding: '14px 20px', color: 'var(--muted, #94a3b8)', fontSize: '12px' }}>
                      {new Date(biz.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/businesses/${biz.id}`)}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--input-bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            border: '1px solid var(--border-color, #334155)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={14} /> View
                        </button>

                        {biz.status === 'Active' ? (
                          <button
                            type="button"
                            onClick={() => { setSuspendModalBiz(biz); setSuspendReason(''); setSuspendError(null); }}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReactivate(biz)}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(16,185,129,0.1)',
                              color: '#10b981',
                              border: '1px solid rgba(16,185,129,0.3)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Provision Business Modal */}
      {provisionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg, #1e293b)', width: '100%', maxWidth: '480px', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text, #f8fafc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#818cf8" /> Provision New Business
              </h3>
              <button type="button" onClick={() => setProvisionModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {provisionError && (
              <div className="alert alert-error" style={{ marginBottom: '16px', fontSize: '13px' }}>
                {provisionError}
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Business Name</label>
                <input type="text" placeholder="e.g. Acme Enterprises" value={provisionName} onChange={(e) => setProvisionName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Owner Full Name</label>
                <input type="text" placeholder="e.g. Rahul Sharma" value={provisionOwnerName} onChange={(e) => setProvisionOwnerName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Owner Email Address</label>
                <input type="email" placeholder="owner@acme.com" value={provisionOwnerEmail} onChange={(e) => setProvisionOwnerEmail(e.target.value)} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setProvisionModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={provisionSubmitting} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{provisionSubmitting ? 'Provisioning...' : 'Create Business'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalBiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg, #1e293b)', width: '100%', maxWidth: '440px', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertOctagon size={18} /> Suspend Business Account
              </h3>
              <button type="button" onClick={() => setSuspendModalBiz(null)} style={{ background: 'none', border: 'none', color: 'var(--muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', marginBottom: '16px' }}>
              Suspending <strong>{suspendModalBiz.name}</strong> will immediately block access for all members across all modules. Data will remain safe and intact.
            </p>

            {suspendError && (
              <div className="alert alert-error" style={{ marginBottom: '16px', fontSize: '13px' }}>
                {suspendError}
              </div>
            )}

            <form onSubmit={handleSuspendSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)', marginBottom: '4px' }}>Suspension Reason</label>
                <textarea rows={3} placeholder="Provide specific compliance or billing reason for suspension..." value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} required style={{ width: '100%', padding: '8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setSuspendModalBiz(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={suspendSubmitting} style={{ padding: '8px 16px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{suspendSubmitting ? 'Suspending...' : 'Confirm Suspension'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
