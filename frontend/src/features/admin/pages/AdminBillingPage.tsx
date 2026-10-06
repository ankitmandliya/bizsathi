import React, { useEffect, useState, useMemo } from 'react';
import { Receipt, CreditCard, Search, RefreshCw, Download, CheckCircle2, Clock, XCircle, X } from 'lucide-react';
import { adminApi, BillingInvoiceItem, BillingPaymentItem } from '../../../services/api/adminApi';
import { getErrorMessage } from '../../../utils/error';
import { AdminPagination } from '../components/AdminPagination';

export function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('invoices');
  const [payments, setPayments] = useState<BillingPaymentItem[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pData, iData] = await Promise.all([adminApi.getPayments(), adminApi.getInvoices()]);
      setPayments(pData || []);
      setInvoices(iData || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'ALL' && inv.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const numMatch = inv.invoice_number.toLowerCase().includes(q);
        const tenantMatch = inv.tenant_id.toLowerCase().includes(q);
        const statusMatch = inv.status.toLowerCase().includes(q);
        if (!numMatch && !tenantMatch && !statusMatch) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, search]);

  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      if (statusFilter !== 'ALL' && pay.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const payIdMatch = (pay.provider_payment_id || '').toLowerCase().includes(q);
        const orderIdMatch = (pay.provider_order_id || '').toLowerCase().includes(q);
        const tenantMatch = pay.tenant_id.toLowerCase().includes(q);
        if (!payIdMatch && !orderIdMatch && !tenantMatch) return false;
      }
      return true;
    });
  }, [payments, statusFilter, search]);

  const currentListLength = activeTab === 'invoices' ? filteredInvoices.length : filteredPayments.length;
  const totalPages = Math.ceil(currentListLength / pageSize) || 1;

  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page, pageSize]);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, page, pageSize]);

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr.toUpperCase()) {
      case 'PAID':
      case 'SUCCESS':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> {statusStr.toUpperCase() === 'SUCCESS' ? 'Success' : 'Paid'}
          </span>
        );
      case 'PENDING':
      case 'DRAFT':
        return (
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {statusStr}
          </span>
        );
      case 'FAILED':
      case 'OVERDUE':
      case 'VOID':
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
            Platform Billing & Revenue
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', margin: '4px 0 0 0' }}>
            Monitor platform payment gateway transactions, generated billing invoices, and tax calculations
          </p>
        </div>

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
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Tabs & Filter Bar */}
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
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('invoices'); setPage(1); setStatusFilter('ALL'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: activeTab === 'invoices' ? '1px solid #6366f1' : '1px solid var(--border-color, #334155)',
              background: activeTab === 'invoices' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'var(--input-bg, #0f172a)',
              color: activeTab === 'invoices' ? '#ffffff' : 'var(--muted, #94a3b8)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Receipt size={15} /> Platform Invoices ({invoices.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('payments'); setPage(1); setStatusFilter('ALL'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: activeTab === 'payments' ? '1px solid #6366f1' : '1px solid var(--border-color, #334155)',
              background: activeTab === 'payments' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'var(--input-bg, #0f172a)',
              color: activeTab === 'payments' ? '#ffffff' : 'var(--muted, #94a3b8)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CreditCard size={15} /> Razorpay Payments ({payments.length})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '360px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder={activeTab === 'invoices' ? 'Search invoice number or tenant...' : 'Search payment ID or order ID...'}
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

      {/* Content Table Card */}
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
          {activeTab === 'invoices' ? (
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
                  <th style={{ padding: '14px 20px' }}>Invoice #</th>
                  <th style={{ padding: '14px 20px' }}>Tenant ID</th>
                  <th style={{ padding: '14px 20px' }}>Subtotal</th>
                  <th style={{ padding: '14px 20px' }}>Tax (18%)</th>
                  <th style={{ padding: '14px 20px' }}>Total Amount</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Invoice Date</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                      Loading platform billing invoices...
                    </td>
                  </tr>
                ) : paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                      No billing invoices found matching search query.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color, #334155)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted, #94a3b8)' }}>
                        {inv.tenant_id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text, #f8fafc)' }}>₹{inv.subtotal.toLocaleString()}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--muted, #94a3b8)' }}>₹{inv.tax_amount.toLocaleString()}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: '#10b981' }}>₹{inv.total.toLocaleString()}</td>
                      <td style={{ padding: '14px 20px' }}>{getStatusBadge(inv.status)}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--muted, #94a3b8)', fontSize: '12px' }}>
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => alert(`Invoice PDF preview for ${inv.invoice_number} (Total: ₹${inv.total})`)}
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
                          <Download size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
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
                  <th style={{ padding: '14px 20px' }}>Provider Payment ID</th>
                  <th style={{ padding: '14px 20px' }}>Provider Order ID</th>
                  <th style={{ padding: '14px 20px' }}>Amount</th>
                  <th style={{ padding: '14px 20px' }}>Provider</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                      Loading Razorpay payment transactions...
                    </td>
                  </tr>
                ) : paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                      No payment transactions found matching search query.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((pay) => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid var(--border-color, #334155)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
                        {pay.provider_payment_id || 'pay_test_' + pay.id.slice(0, 6)}
                      </td>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted, #94a3b8)' }}>
                        {pay.provider_order_id || 'order_test_' + pay.id.slice(0, 6)}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: '#10b981' }}>₹{pay.amount.toLocaleString()}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--muted, #94a3b8)', fontWeight: 600 }}>{pay.provider || 'RAZORPAY'}</td>
                      <td style={{ padding: '14px 20px' }}>{getStatusBadge(pay.status)}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--muted, #94a3b8)', fontSize: '12px' }}>
                        {pay.paid_at ? new Date(pay.paid_at).toLocaleString() : new Date(pay.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={currentListLength}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        />
      </div>
    </div>
  );
}
