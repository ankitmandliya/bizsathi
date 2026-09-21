import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { crmApi } from '../services/crmApi';
import { Customer, CustomerCreate } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: Customer | null;
}

export function CustomerModal({ isOpen, onClose, onSuccess, customer }: CustomerModalProps) {
  const [formData, setFormData] = useState<CustomerCreate>({
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        customer_type: customer.customer_type || 'Individual',
        company: customer.company || '',
        billing_address: customer.billing_address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        gstin: customer.gstin || '',
        pan: customer.pan || '',
        opening_balance: customer.opening_balance || 0,
        opening_balance_type: customer.opening_balance_type || 'Debit',
        credit_limit: customer.credit_limit ?? undefined,
        notes: customer.notes || '',
      });
    } else {
      setFormData({
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
      });
    }
    setError(null);
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Customer Name and Mobile Number are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (customer) {
        await crmApi.updateCustomer(customer.id, formData);
      } else {
        await crmApi.createCustomer(formData);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, customer ? 'Failed to update customer' : 'Failed to create customer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
      size="lg"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Row 1: Name & Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
              Customer Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Traders"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
              Mobile Number <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Row 2: Email & Customer Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Email</label>
            <input
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Customer Type</label>
            <select
              value={formData.customer_type}
              onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }}
            >
              <option value="Individual">Individual</option>
              <option value="Business">Business</option>
            </select>
          </div>
        </div>

        {/* Row 3: Company & GSTIN */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Company Name</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Enterprises"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>GSTIN</label>
            <input
              type="text"
              placeholder="e.g. 27AAAAA0000A1Z5"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Billing Address */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Billing Address</label>
          <input
            type="text"
            placeholder="Street address, shop number, building"
            value={formData.billing_address}
            onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Row 5: City, State, Pincode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>City</label>
            <input
              type="text"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>State</label>
            <input
              type="text"
              placeholder="e.g. Maharashtra"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pincode</label>
            <input
              type="text"
              placeholder="e.g. 400001"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Row 6: PAN & Credit Limit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>PAN</label>
            <input
              type="text"
              placeholder="e.g. ABCDE1234F"
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Credit Limit (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="Leave blank for no limit"
              value={formData.credit_limit ?? ''}
              onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value ? parseFloat(e.target.value) : undefined })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Row 7: Opening Balance & Balance Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Opening Balance (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.opening_balance ?? 0}
              onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Balance Type</label>
            <select
              value={formData.opening_balance_type}
              onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value as 'Debit' | 'Credit' })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }}
            >
              <option value="Debit">Debit (Customer owes you)</option>
              <option value="Credit">Credit (You owe customer / Advance)</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea
            rows={2}
            placeholder="Additional details, preferences, or internal remarks..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Saving...' : customer ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
