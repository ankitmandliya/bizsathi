import { useEffect, useState } from 'react';
import { Calendar, FileText, Plus, ShieldAlert, Trash2, User } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { crmApi, Customer } from '../../crm/services/crmApi';
import { CreditLimitWarning, LineItem, salesApi } from '../services/salesApi';
import { getErrorMessage } from '../../../utils/error';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceModal({ isOpen, onClose, onSuccess }: InvoiceModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, tax_rate_percent: 18 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState<CreditLimitWarning | null>(null);

  useEffect(() => {
    if (isOpen) {
      crmApi.getCustomers().then((res) => {
        if (Array.isArray(res)) setCustomers(res);
        else if (res && 'items' in res) setCustomers(res.items);
      }).catch(() => {});
      setCreditWarning(null);
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, rate: 0, tax_rate_percent: 18 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalTax = items.reduce(
    (sum, item) => sum + (item.quantity * item.rate * item.tax_rate_percent) / 100,
    0
  );
  const grandTotal = subtotal + totalTax;

  const submitInvoice = async (confirmOverride = false) => {
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('Line item description is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await salesApi.createInvoice({
        customer_id: selectedCustomerId,
        issue_date: new Date(issueDate).toISOString(),
        due_date: new Date(dueDate).toISOString(),
        notes: notes || undefined,
        items,
        confirm: confirmOverride,
      });

      if ('warning' in res && res.warning) {
        setCreditWarning(res);
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create invoice.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitInvoice(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Tax Invoice" size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <Select
            label="Customer"
            icon={<User size={14} />}
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            required
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Issue Date"
            icon={<Calendar size={14} />}
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />

          <Input
            label="Due Date"
            icon={<Calendar size={14} />}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        {/* Line Items Table Section */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', background: 'var(--panel-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} /> Line Items
            </h4>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus size={14} style={{ marginRight: '4px' }} /> Add Item
            </Button>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            <div style={{ minWidth: '540px' }}>
              {/* Table Column Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.2fr 36px',
                  gap: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--muted)',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div>Description</div>
                <div>Qty</div>
                <div>Rate (₹)</div>
                <div>GST Tax</div>
                <div style={{ textAlign: 'right' }}>Total (₹)</div>
                <div />
              </div>

              {/* Items List */}
              {items.map((item, index) => {
                const itemTotal = item.quantity * item.rate * (1 + item.tax_rate_percent / 100);
                return (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.2fr 36px',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <Input
                      placeholder="Product or Service name"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      required
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      required
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                      required
                    />
                    <Select
                      value={item.tax_rate_percent}
                      onChange={(e) => handleItemChange(index, 'tax_rate_percent', parseFloat(e.target.value) || 0)}
                    >
                      <option value={0}>0% GST</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </Select>
                    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '13.5px', color: 'var(--text)' }}>
                      ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: items.length === 1 ? 'var(--muted)' : '#ef4444',
                        cursor: items.length === 1 ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subtotal & Taxes Breakdown */}
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '6px',
              fontSize: '13.5px',
            }}
          >
            <div style={{ color: 'var(--muted)' }}>Subtotal: <strong>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            <div style={{ color: 'var(--muted)' }}>GST Tax Total: <strong>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--primary)',
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: '1px solid var(--line)',
                width: '100%',
                textAlign: 'right',
              }}
            >
              Grand Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <Input
          label="Notes / Payment Details"
          icon={<FileText size={14} />}
          placeholder="Payment options: UPI (bizsathi@upi) or Bank Transfer."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="modal-actions-bar" style={{ margin: '8px -24px -20px -24px', borderRadius: '0 0 16px 16px' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Invoice
          </Button>
        </div>
      </form>

      {creditWarning && (
        <Modal
          isOpen={!!creditWarning}
          onClose={() => setCreditWarning(null)}
          title="Credit Limit Warning"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <ShieldAlert size={22} color="#d97706" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#92400e' }}>Credit Limit Exceeded</h4>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                {creditWarning.message}
              </p>
              <div style={{ marginTop: 12, padding: 10, background: '#ffffff', borderRadius: 8, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Current Outstanding:</strong> ₹{creditWarning.current_outstanding.toLocaleString()}</div>
                <div><strong>This Invoice Amount:</strong> ₹{creditWarning.invoice_amount.toLocaleString()}</div>
                <div><strong>Credit Limit:</strong> ₹{creditWarning.credit_limit.toLocaleString()}</div>
                <div style={{ color: '#dc2626', fontWeight: 700 }}><strong>Projected Outstanding:</strong> ₹{creditWarning.projected_outstanding.toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button type="button" variant="outline" onClick={() => setCreditWarning(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" loading={loading} onClick={() => submitInvoice(true)}>
                Proceed & Create Invoice
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
