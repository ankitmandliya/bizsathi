import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, ExternalLink, FileText } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Quotation, salesApi } from '../services/salesApi';
import { crmApi } from '../../crm/services/crmApi';
import { Customer } from '../../crm/types/crm';
import { getErrorMessage } from '../../../utils/error';
import { getAccessToken } from '../../../services/auth/tokens';

interface QuotationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string | null;
  onSuccess?: () => void;
}

export function QuotationDetailModal({ isOpen, onClose, quotationId, onSuccess }: QuotationDetailModalProps) {
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!isOpen || !quotationId) {
      setQuotation(null);
      setCustomer(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = await salesApi.getQuotation(quotationId);
        setQuotation(q);

        if (q.customer_id) {
          try {
            const cust = await crmApi.getCustomer(q.customer_id);
            setCustomer(cust);
          } catch {
            setCustomer(null);
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load quotation details.'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, quotationId]);

  const handleConvertToInvoice = async () => {
    if (!quotationId) return;
    setConverting(true);
    try {
      await salesApi.convertQuotationToInvoice(quotationId);
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to convert quotation to invoice.'));
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!quotationId) return;
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = getAccessToken();
    const pdfUrl = `${backendUrl}/api/v1/sales/quotations/${quotationId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(pdfUrl, '_blank');
  };

  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case 'Accepted':
        return 'badge-success';
      case 'Sent':
        return 'badge-primary';
      case 'Rejected':
      case 'Expired':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quotation ? `Quotation — ${quotation.quotation_number}` : 'Quotation Details'}
      size="lg"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
          Loading quotation details…
        </div>
      ) : error || !quotation ? (
        <div className="alert alert-error">{error || 'Quotation not found'}</div>
      ) : (
        <div className="space-y-6">
          {/* Header Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div>
              <span className={`badge ${getStatusBadgeClass(quotation.status)}`}>{quotation.status}</span>
              <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Issued: {new Date(quotation.issue_date).toLocaleDateString()} | Valid Until: {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : '—'}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { onClose(); navigate(`/sales/quotations/${quotation.id}`); }}>
              Full Page View <ExternalLink size={14} style={{ marginLeft: '4px' }} />
            </Button>
          </div>

          {/* Customer Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billed / Prepared For</span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                {customer?.name || 'Customer'}
              </h4>
              {customer?.company && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{customer.company}</div>}
              {customer?.billing_address && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{customer.billing_address}</div>}
            </div>
            {customer && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
                {customer.email && <div>{customer.email}</div>}
                {customer.phone && <div>{customer.phone}</div>}
                {customer.gstin && <div style={{ fontWeight: 600 }}>GSTIN: {customer.gstin}</div>}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Line Items</h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'center', width: '70px' }}>Qty</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right', width: '70px' }}>Tax %</th>
                    <th style={{ textAlign: 'right', width: '110px' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items && quotation.items.length > 0 ? (
                    quotation.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.description}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>{item.tax_rate_percent}%</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          ₹{(item.total ?? (item.quantity * item.rate * (1 + item.tax_rate_percent / 100))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No items listed.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span>₹{quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax (GST):</span>
                <span>₹{quotation.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: '8px', color: 'var(--primary)' }}>
                <span>Grand Total:</span>
                <span>₹{quotation.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
              <strong>Notes / Terms:</strong> {quotation.notes}
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download size={14} style={{ marginRight: '6px' }} /> Download PDF
            </Button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>

              {quotation.status !== 'Accepted' && (
                <Button variant="primary" loading={converting} onClick={handleConvertToInvoice}>
                  Convert to Invoice <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
