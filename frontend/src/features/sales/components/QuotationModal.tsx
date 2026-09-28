import React, { useEffect, useState } from 'react';
import { Calendar, FileText, Plus, Trash2, User, UserPlus, Users } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { crmApi } from '../../crm/services/crmApi';
import { Customer, CustomerCreate } from '../../crm/types/crm';
import { LineItem, salesApi } from '../services/salesApi';
import { getErrorMessage } from '../../../utils/error';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialNewCustomerState: CustomerCreate = {
  name: '',
  phone: '',
  email: '',
  customer_type: 'Individual',
  company: '',
  billing_address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  opening_balance: 0,
  opening_balance_type: 'Debit',
  credit_limit: undefined,
  notes: '',
};

export function QuotationModal({ isOpen, onClose, onSuccess }: QuotationModalProps) {
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState<CustomerCreate>(initialNewCustomerState);

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
      setCustomerMode('existing');
      setSelectedCustomerId('');
      setNewCustomer(initialNewCustomerState);
      setIssueDate(new Date().toISOString().split('T')[0]);
      setValidUntil(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setNotes('');
      setItems([{ description: '', quantity: 1, rate: 0, tax_rate_percent: 18 }]);
      setError(null);
      crmApi
        .getCustomers()
        .then((res) => {
          if (Array.isArray(res)) setCustomers(res);
          else if (res && 'items' in res) setCustomers(res.items);
        })
        .catch(() => {});
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
      let cleanedVal: string | number = val;

      if (field === 'quantity' || field === 'rate') {
        let str = String(val).replace(/[^0-9.]/g, '');
        const parts = str.split('.');
        if (parts.length > 2) {
          str = parts[0] + '.' + parts.slice(1).join('');
        }
        cleanedVal = str;
      }

      updated[index] = { ...updated[index], [field]: cleanedVal };
      return updated;
    });
  };

  // Safe live total calculation (never NaN)
  const subtotal = items.reduce((sum, item) => {
    const q = parseFloat(String(item.quantity)) || 0;
    const r = parseFloat(String(item.rate)) || 0;
    return sum + q * r;
  }, 0);

  const totalTax = items.reduce((sum, item) => {
    const q = parseFloat(String(item.quantity)) || 0;
    const r = parseFloat(String(item.rate)) || 0;
    const t = Number(item.tax_rate_percent) || 0;
    return sum + (q * r * t) / 100;
  }, 0);

  const grandTotal = subtotal + totalTax;

  // Live duplicate mobile check against existing loaded customers
  const cleanPhone = newCustomer.phone.trim();
  const duplicateCustomer =
    customerMode === 'new' && cleanPhone.length > 0
      ? customers.find((c) => c.phone && c.phone.trim() === cleanPhone)
      : null;
  const phoneError = duplicateCustomer
    ? `Customer with mobile number '${cleanPhone}' already exists (${duplicateCustomer.name}). Mobile numbers must be unique.`
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetCustomerId = selectedCustomerId;

    if (customerMode === 'new') {
      if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
        setError('Customer Name and Mobile Number are required for new customer registration.');
        return;
      }

      if (duplicateCustomer) {
        setError(`A customer with mobile number '${cleanPhone}' already exists (${duplicateCustomer.name}). Mobile numbers must be unique.`);
        return;
      }
    } else {
      if (!selectedCustomerId) {
        setError('Please select an existing customer.');
        return;
      }
    }

    if (items.some((i) => !i.description.trim())) {
      setError('Line item description is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (customerMode === 'new') {
        const createdCustomer = await crmApi.createCustomer(newCustomer);
        targetCustomerId = createdCustomer.id;
      }

      const formattedItems = items.map((i) => ({
        description: i.description,
        quantity: parseFloat(String(i.quantity)) || 0,
        rate: parseFloat(String(i.rate)) || 0,
        tax_rate_percent: Number(i.tax_rate_percent) || 0,
      }));

      await salesApi.createQuotation({
        customer_id: targetCustomerId,
        issue_date: new Date(issueDate).toISOString(),
        valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
        notes: notes || undefined,
        items: formattedItems,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create quotation. Check mobile number uniqueness.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Sales Quotation" size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Sticky Error Notification Bar (Top of Form) */}
        {error && (
          <div
            style={{
              position: 'sticky',
              top: '-20px',
              zIndex: 30,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)',
            }}
          >
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Customer Selection Mode */}
        <div style={{ background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              Send Quotation To:
            </span>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button
                type="button"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: customerMode === 'existing' ? 'var(--primary)' : 'transparent',
                  color: customerMode === 'existing' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => { setCustomerMode('existing'); setError(null); }}
              >
                <Users size={14} /> Existing Customer
              </button>

              <button
                type="button"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: customerMode === 'new' ? 'var(--primary)' : 'transparent',
                  color: customerMode === 'new' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => { setCustomerMode('new'); setError(null); }}
              >
                <UserPlus size={14} /> + New Customer
              </button>
            </div>
          </div>

          {customerMode === 'existing' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '4px' }}>
              <Select
                label="Select Customer *"
                icon={<User size={14} />}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required={customerMode === 'existing'}
              >
                <option value="">Choose customer from list...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </Select>

              <Input
                label="Issue Date *"
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
          ) : (
            /* New Customer Registration Form */
            <div style={{ marginTop: '6px', padding: '16px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                New Customer Registration
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Customer Name *"
                  placeholder="e.g. Ramesh Traders"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  required
                />

                <Input
                  label="Mobile Number (Unique) *"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 9876543210"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  error={phoneError}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={newCustomer.email || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />

                <Select
                  label="Customer Type"
                  value={newCustomer.customer_type || 'Individual'}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
                >
                  <option value="Individual">Individual</option>
                  <option value="Business">Business</option>
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Company Name"
                  placeholder="e.g. Ramesh Enterprises"
                  value={newCustomer.company || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                />

                <Input
                  label="GSTIN"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={newCustomer.gstin || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
                />
              </div>

              <Input
                label="Billing Address"
                placeholder="Street address, shop number, building"
                value={newCustomer.billing_address || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, billing_address: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <Input
                  label="City"
                  placeholder="e.g. Mumbai"
                  value={newCustomer.city || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                />

                <Input
                  label="State"
                  placeholder="e.g. Maharashtra"
                  value={newCustomer.state || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                />

                <Input
                  label="Pincode"
                  placeholder="e.g. 400001"
                  type="text"
                  inputMode="numeric"
                  value={newCustomer.pincode || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, pincode: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="PAN"
                  placeholder="e.g. ABCDE1234F"
                  value={newCustomer.pan || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, pan: e.target.value.toUpperCase() })}
                />

                <Input
                  label="Credit Limit (₹)"
                  type="text"
                  inputMode="decimal"
                  placeholder="Leave blank for no limit"
                  value={newCustomer.credit_limit ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCustomer({ ...newCustomer, credit_limit: val ? (parseFloat(val) || undefined) : undefined });
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Opening Balance (₹)"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={newCustomer.opening_balance ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCustomer({ ...newCustomer, opening_balance: val ? (parseFloat(val) || 0) : 0 });
                  }}
                />

                <Select
                  label="Balance Type"
                  value={newCustomer.opening_balance_type || 'Debit'}
                  onChange={(e) => setNewCustomer({ ...newCustomer, opening_balance_type: e.target.value as 'Debit' | 'Credit' })}
                >
                  <option value="Debit">Debit (Customer owes you)</option>
                  <option value="Credit">Credit (You owe customer / Advance)</option>
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <Input
                  label="Issue Date *"
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
            </div>
          )}
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
                  const numQty = Number(item.quantity) || 0;
                  const numRate = Number(item.rate) || 0;
                  const itemTotal = numQty * numRate * (1 + item.tax_rate_percent / 100);
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
                        type="text"
                        inputMode="decimal"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        required
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

        <div className="modal-actions-bar" style={{ margin: '8px -24px -20px -24px', borderRadius: '0 0 16px 16px', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <div
              style={{
                width: '100%',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <span>⚠️ {error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={!!phoneError}>
              Save Quotation
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

