import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, FileText, User } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Quotation, salesApi } from '../services/salesApi';
import { crmApi } from '../../crm/services/crmApi';
import { Customer } from '../../crm/types/crm';
import { getErrorMessage } from '../../../utils/error';
import { getAccessToken } from '../../../services/auth/tokens';

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchQuotationDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const qData = await salesApi.getQuotation(id);
      setQuotation(qData);

      if (qData.customer_id) {
        try {
          const custData = await crmApi.getCustomer(qData.customer_id);
          setCustomer(custData);
        } catch {
          // If customer fetch fails, fall back gracefully
          setCustomer(null);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch quotation details.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotationDetail();
  }, [fetchQuotationDetail]);

  const handleConvertToInvoice = async () => {
    if (!id || !quotation) return;
    setConverting(true);
    try {
      await salesApi.convertQuotationToInvoice(id);
      await fetchQuotationDetail();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to convert quotation to invoice.'));
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!id) return;
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = getAccessToken();
    const pdfUrl = `${backendUrl}/api/v1/sales/quotations/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px' }}>Loading quotation details…</div>;
  }

  if (error || !quotation) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/sales/quotations')}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Quotations
        </Button>
        <div className="alert alert-error">{error || 'Quotation not found'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/sales/quotations')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Quotation {quotation.quotation_number}
              <span className={`badge ${getStatusBadgeClass(quotation.status)}`}>
                {quotation.status}
              </span>
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Issued: {new Date(quotation.issue_date).toLocaleDateString()} | Valid Until: {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download size={16} style={{ marginRight: '6px' }} /> Download PDF
          </Button>

          {quotation.status !== 'Accepted' ? (
            <Button variant="primary" loading={converting} onClick={handleConvertToInvoice}>
              Convert to Invoice <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </Button>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '14px' }}>
              Converted to Invoice
            </span>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Main Details & Line Items */}
        <div className="card space-y-6" style={{ gridColumn: 'span 2' }}>
          {/* Customer Info Sub-Header */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billed / Prepared For</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                {customer?.name || 'Customer / Prospect'}
              </h3>
              {customer?.company && (
                <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>{customer.company}</p>
              )}
              {customer?.billing_address && (
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{customer.billing_address}</p>
              )}
            </div>
            {customer && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
                {customer.email && <div>{customer.email}</div>}
                {customer.phone && <div>{customer.phone}</div>}
                {customer.gstin && <div style={{ fontWeight: 600, marginTop: '2px' }}>GSTIN: {customer.gstin}</div>}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>Line Items & Services</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>Qty</th>
                    <th style={{ textAlign: 'right', width: '120px' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right', width: '90px' }}>Tax %</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Total (₹)</th>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No items specified.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax Amount (GST):</span>
                <span style={{ fontWeight: 600 }}>₹{quotation.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: '10px', marginTop: '4px', color: 'var(--primary)' }}>
                <span>Grand Total:</span>
                <span>₹{quotation.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes / Terms & Conditions */}
          {quotation.notes && (
            <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '13px' }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '4px' }}>Terms & Conditions / Notes:</strong>
              <div style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
            </div>
          )}
        </div>

        {/* Sidebar Summary Card */}
        <div className="card space-y-4" style={{ height: 'fit-content' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> Summary Overview
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quotation No:</span>
              <strong style={{ color: 'var(--primary)' }}>{quotation.quotation_number}</strong>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className={`badge ${getStatusBadgeClass(quotation.status)}`}>{quotation.status}</span>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Issue Date:</span>
              <strong style={{ color: 'var(--text)' }}>{new Date(quotation.issue_date).toLocaleDateString()}</strong>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Valid Until:</span>
              <strong style={{ color: 'var(--text)' }}>{quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : '—'}</strong>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--primary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Value:</span>
              <strong style={{ fontSize: '16px', color: 'var(--text)' }}>₹{quotation.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
