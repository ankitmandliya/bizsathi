import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, CreditCard, Download, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Invoice, Payment, salesApi } from '../services/salesApi';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { getErrorMessage } from '../../../utils/error';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const fetchInvoiceDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const invData = await salesApi.getInvoice(id);
      setInvoice(invData);

      const payData = await salesApi.getPayments({ invoice_id: id });
      setPayments(payData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch invoice details.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [fetchInvoiceDetail]);

  const handleSendReminder = async () => {
    if (!id) return;
    try {
      const res = await salesApi.sendInvoiceReminder(id);
      setReminderMessage(res.message);
      setTimeout(() => setReminderMessage(null), 4000);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to send reminder.'));
    }
  };

  const handleDownloadPdf = () => {
    if (!id) return;
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${backendUrl}/api/v1/sales/invoices/${id}/pdf`, '_blank');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px' }}>Loading invoice details…</div>;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/sales/invoices')}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Invoices
        </Button>
        <div className="alert alert-error">{error || 'Invoice not found'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/sales/invoices')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Invoice {invoice.invoice_number}
              <span className={`badge ${invoice.status === 'Paid' ? 'badge-success' : invoice.status === 'Overdue' ? 'badge-danger' : 'badge-primary'}`}>
                {invoice.status}
              </span>
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Issued: {new Date(invoice.issue_date).toLocaleDateString()} | Due: {new Date(invoice.due_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download size={16} style={{ marginRight: '6px' }} /> Download PDF
          </Button>

          {invoice.amount_due > 0 && invoice.status !== 'Cancelled' && (
            <>
              <Button variant="outline" onClick={handleSendReminder}>
                <Bell size={16} style={{ marginRight: '6px' }} /> Send Reminder
              </Button>
              <Button variant="primary" onClick={() => setIsPaymentOpen(true)}>
                <CreditCard size={16} style={{ marginRight: '6px' }} /> Record Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {reminderMessage && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} /> {reminderMessage}
        </div>
      )}

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Invoice Summary & Items */}
        <div className="card space-y-6" style={{ gridColumn: 'span 2' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>Line Items</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Free-text line items with auto-calculated tax totals</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Tax %</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.description}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right' }}>{item.tax_rate_percent}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax Amount (GST):</span>
                <span>₹{invoice.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <span>Total Amount:</span>
                <span>₹{invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 600 }}>
                <span>Amount Paid:</span>
                <span>₹{invoice.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', fontWeight: 700, fontSize: '16px' }}>
                <span>Amount Due:</span>
                <span>₹{invoice.amount_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius)', fontSize: '13px' }}>
              <strong>Notes / Payment Terms:</strong> {invoice.notes}
            </div>
          )}
        </div>

        {/* Payments Sidebar History */}
        <div className="card space-y-4">
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Payment History</h3>

          {payments.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
              No payments recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', color: 'var(--success)' }}>
                    <span>{p.receipt_number}</span>
                    <span>₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(p.payment_date).toLocaleDateString()} via <strong>{p.payment_mode}</strong>
                  </div>
                  {p.notes && <div style={{ fontSize: '12px', marginTop: '4px' }}>{p.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        invoice={invoice}
        onSuccess={fetchInvoiceDetail}
      />
    </div>
  );
}
