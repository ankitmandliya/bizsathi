import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Quotation, salesApi } from '../services/salesApi';
import { QuotationModal } from '../components/QuotationModal';
import { getErrorMessage } from '../../../utils/error';

export function QuotationsListPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.getQuotations({
        status: statusFilter || undefined,
      });
      setQuotations(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch quotations.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleConvertToInvoice = async (quotationId: string) => {
    setConvertingId(quotationId);
    try {
      await salesApi.convertQuotationToInvoice(quotationId);
      await fetchQuotations();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to convert quotation to invoice.'));
    } finally {
      setConvertingId(null);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} style={{ color: 'var(--primary)' }} /> Quotations & Proposals
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Create and track sales quotations before converting them to invoices.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Create Quotation
        </Button>
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
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </Select>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {quotations.length} of {total} quotations
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Quotations Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation #</th>
                <th>Issue Date</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>Loading quotations…</td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No quotations found. Click "Create Quotation" to create your first proposal.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.quotation_number}</td>
                    <td>{new Date(q.issue_date).toLocaleDateString()}</td>
                    <td>{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ₹{q.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {q.status !== 'Accepted' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={convertingId === q.id}
                          onClick={() => handleConvertToInvoice(q.id)}
                        >
                          Convert to Invoice <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                        </Button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>Converted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuotationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchQuotations}
      />
    </div>
  );
}
