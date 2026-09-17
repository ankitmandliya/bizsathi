import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { CustomerStatement, salesApi } from '../services/salesApi';
import { getErrorMessage } from '../../../utils/error';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
}

export function CustomerStatementModal({ isOpen, onClose, customerId }: CustomerStatementModalProps) {
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      setError(null);
      salesApi
        .getCustomerStatement(customerId)
        .then(setStatement)
        .catch((err) => setError(getErrorMessage(err, 'Failed to load customer statement')))
        .finally(() => setLoading(false));
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Statement" size="lg">
      {loading && <div style={{ textAlign: 'center', padding: '24px' }}>Loading statement…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {statement && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Customer Header & Summary Cards */}
          <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--text)' }}>
              {statement.customer_name}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Invoiced</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  ₹{statement.total_invoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Paid</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>
                  ₹{statement.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Outstanding Balance</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--danger)' }}>
                  ₹{statement.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Invoices ({statement.invoices.length})
            </h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : 'badge-primary'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>₹{inv.total_amount.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: inv.amount_due > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        ₹{inv.amount_due.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {statement.invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments History */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Payment History ({statement.payments.length})
            </h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.receipt_number}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td>{p.payment_mode}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        +₹{p.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {statement.payments.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payments recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
