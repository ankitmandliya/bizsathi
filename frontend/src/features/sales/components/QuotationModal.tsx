import { useEffect, useState } from 'react';
import { Calendar, FileText, Plus, Trash2, User } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { crmApi, Customer } from '../../crm/services/crmApi';
import { LineItem, salesApi } from '../services/salesApi';
import { getErrorMessage } from '../../../utils/error';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuotationModal({ isOpen, onClose, onSuccess }: QuotationModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, tax_rate_percent: 18 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      crmApi.getCustomers().then(setCustomers).catch(() => {});
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

  // Live total calculation
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalTax = items.reduce(
    (sum, item) => sum + (item.quantity * item.rate * item.tax_rate_percent) / 100,
    0
  );
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await salesApi.createQuotation({
        customer_id: selectedCustomerId,
        issue_date: new Date(issueDate).toISOString(),
        valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
        notes: notes || undefined,
        items,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create quotation.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Sales Quotation" size="lg">
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
            label="Valid Until"
            icon={<Calendar size={14} />}
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
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
                  background: 'var(--panel)',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid var(--line)',
                }}
              >
                <div>Item Description</div>
                <div>Qty</div>
                <div>Rate (₹)</div>
                <div>GST Tax</div>
                <div style={{ textAlign: 'right' }}>Total</div>
                <div></div>
              </div>

              {/* Line Item Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, idx) => {
                  const itemTotal = item.quantity * item.rate * (1 + item.tax_rate_percent / 100);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.2fr 36px',
                        gap: '10px',
                        alignItems: 'center',
                        background: 'var(--panel)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <Input
                        placeholder="e.g. Consulting Services / Product"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        required
                      />
                      <Input
                        type="number"
                        min="0.1"
                        step="1"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                      />
                      <Select
                        value={item.tax_rate_percent}
                        onChange={(e) => handleItemChange(idx, 'tax_rate_percent', parseFloat(e.target.value) || 0)}
                      >
                        <option value={0}>0% GST</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST</option>
                        <option value={28}>28% GST</option>
                      </Select>
                      <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                        ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        style={{ color: 'var(--danger)', padding: '4px' }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Totals Card */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'var(--panel)',
              borderRadius: '10px',
              border: '1px solid var(--line)',
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
          label="Notes / Terms & Conditions"
          icon={<FileText size={14} />}
          placeholder="Payment due within 30 days. Quotation valid for 30 days."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="modal-actions-bar" style={{ margin: '8px -24px -20px -24px', borderRadius: '0 0 16px 16px' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Quotation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
