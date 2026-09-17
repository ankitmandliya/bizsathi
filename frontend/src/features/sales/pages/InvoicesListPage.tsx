import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, DollarSign, FileText, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Invoice, salesApi } from '../services/salesApi';
import { InvoiceModal } from '../components/InvoiceModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { getErrorMessage } from '../../../utils/error';

export function InvoicesListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedCustomerIdForStatement, setSelectedCustomerIdForStatement] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.getInvoices({
        status: statusFilter || undefined,
      });
      setInvoices(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch invoices.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.status !== 'Cancelled' ? inv.amount_due : 0), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);

  const getStatusBadge = (inv: Invoice) => {
    if (inv.status === 'Paid') return <span className="badge badge-success">Paid</span>;
    if (inv.status === 'Overdue') return <span className="badge badge-danger">Overdue</span>;
    if (inv.status === 'Partially Paid') return <span className="badge badge-warning">Partially Paid</span>;
    if (inv.status === 'Cancelled') return <span className="badge badge-secondary">Cancelled</span>;
    return <span className="badge badge-primary">{inv.status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} style={{ color: 'var(--primary)' }} /> Invoices & Billing
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Create GST-compliant invoices, track overdue payments, and record payments easily.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stats KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Amount Due</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Amount Paid</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
              ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '200px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Paid">Paid</option>
            </Select>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {invoices.length} of {total} invoices
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Invoices Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Amount Due</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>Loading invoices…</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No invoices found. Click "New Invoice" to create an invoice.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{inv.invoice_number}</td>
                    <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td>{getStatusBadge(inv)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: inv.amount_due > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ₹{inv.amount_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {inv.amount_due > 0 && inv.status !== 'Cancelled' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                          >
                            Record Payment
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCustomerIdForStatement(inv.customer_id)}
                        >
                          Statement
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchInvoices}
      />

      <RecordPaymentModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onSuccess={fetchInvoices}
      />

      <CustomerStatementModal
        isOpen={!!selectedCustomerIdForStatement}
        onClose={() => setSelectedCustomerIdForStatement(null)}
        customerId={selectedCustomerIdForStatement}
      />
    </div>
  );
}
