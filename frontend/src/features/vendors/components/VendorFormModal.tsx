import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { Vendor, VendorCreateInput } from '../types/vendor';

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VendorCreateInput) => Promise<void>;
  initialData?: Vendor | null;
  isEdit?: boolean;
}

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState<VendorCreateInput>({
    name: '',
    phone: '',
    contact_person: '',
    email: '',
    vendor_type: 'Business',
    company_name: '',
    billing_address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    payment_terms: '',
    opening_balance: 0,
    opening_balance_type: 'Payable',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        contact_person: initialData.contact_person || '',
        email: initialData.email || '',
        vendor_type: initialData.vendor_type || 'Business',
        company_name: initialData.company_name || '',
        billing_address: initialData.billing_address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        gstin: initialData.gstin || '',
        pan: initialData.pan || '',
        payment_terms: initialData.payment_terms || '',
        opening_balance: initialData.opening_balance || 0,
        opening_balance_type: initialData.opening_balance_type || 'Payable',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        contact_person: '',
        email: '',
        vendor_type: 'Business',
        company_name: '',
        billing_address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        pan: '',
        payment_terms: '',
        opening_balance: 0,
        opening_balance_type: 'Payable',
        notes: '',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setError('Vendor Name is required.');
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      setError('Phone Number is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(errorObj.response?.data?.detail || errorObj.message || 'Failed to save vendor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel-alt)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                {isEdit ? 'Edit Vendor Profile' : 'Add New Vendor'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                {isEdit ? 'Update vendor contact and payment terms' : 'Register a new supplier or vendor account'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {/* Basic Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Vendor Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rajesh Electricals"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Phone Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. vendor@example.com"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Vendor Type
              </label>
              <select
                value={formData.vendor_type}
                onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value as 'Individual' | 'Business' })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Business">Business (Pvt Ltd, Firm, Trader)</option>
                <option value="Individual">Individual (Freelancer, Consultant)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Rajesh Electricals Pvt Ltd"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Tax & Financial Details */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tax & Payment Terms
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="e.g. 08ABCDE1234F1Z5"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  PAN Card Number
                </label>
                <input
                  type="text"
                  value={formData.pan || ''}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  placeholder="e.g. ABCDE1234F"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.payment_terms || ''}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g. Net 30, COD, Advance"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--panel-alt)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  Balance Nature
                </label>
                <select
                  value={formData.opening_balance_type}
                  onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value as 'Payable' | 'Advance' })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Payable">Payable (You owe this vendor)</option>
                  <option value="Advance">Advance (Vendor owes you / Paid in advance)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                City
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Jaipur"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                State
              </label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Rajasthan"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode || ''}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g. 302013"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Billing Address
            </label>
            <textarea
              value={formData.billing_address || ''}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              rows={2}
              placeholder="e.g. Plot No 42, VKIA Area, Jaipur"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Internal Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional vendor terms, bank details, or contact notes..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
              }}
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
