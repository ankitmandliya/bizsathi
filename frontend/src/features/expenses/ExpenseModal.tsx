import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, IndianRupee } from 'lucide-react';
import { Expense, ExpenseCategory, expensesApi } from './services/expensesApi';
import { getErrorMessage } from '../../utils/error';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: Expense | null;
  categories: ExpenseCategory[];
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
  categories,
}: ExpenseModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'UPI' | 'CARD' | 'OTHER'>('CASH');
  const [vendorName, setVendorName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => c.is_active);

  useEffect(() => {
    if (expenseToEdit) {
      setCategoryId(expenseToEdit.category_id);
      setTitle(expenseToEdit.title);
      setDescription(expenseToEdit.description || '');
      setAmount(String(expenseToEdit.amount));
      setExpenseDate(expenseToEdit.expense_date);
      setPaymentMethod(expenseToEdit.payment_method);
      setVendorName(expenseToEdit.vendor_name || '');
      setReferenceNumber(expenseToEdit.reference_number || '');
      setReceiptUrl(expenseToEdit.receipt_url || '');
    } else {
      setCategoryId(activeCategories[0]?.id || '');
      setTitle('');
      setDescription('');
      setAmount('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('CASH');
      setVendorName('');
      setReferenceNumber('');
      setReceiptUrl('');
    }
    setError(null);
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    setError(null);
    try {
      const res = await expensesApi.uploadReceipt(file);
      setReceiptUrl(res.receipt_url);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to upload receipt file'));
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError('Please select an active expense category');
      return;
    }
    if (!title.trim()) {
      setError('Expense title is required');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      if (expenseToEdit) {
        await expensesApi.updateExpense(expenseToEdit.id, {
          category_id: categoryId,
          title: title.trim(),
          description: description.trim() || null,
          amount: numAmount,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          vendor_name: vendorName.trim() || null,
          reference_number: referenceNumber.trim() || null,
          receipt_url: receiptUrl || null,
        });
      } else {
        await expensesApi.createExpense({
          category_id: categoryId,
          title: title.trim(),
          description: description.trim() || null,
          amount: numAmount,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          vendor_name: vendorName.trim() || null,
          reference_number: referenceNumber.trim() || null,
          receipt_url: receiptUrl || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save office expense'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
            {expenseToEdit ? 'Edit Office Expense' : 'Add New Office Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Category */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                CATEGORY *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
                required
              >
                {activeCategories.length === 0 ? (
                  <option value="">No active categories available</option>
                ) : (
                  activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                EXPENSE TITLE *
              </label>
              <input
                type="text"
                placeholder="e.g. Office Electricity Bill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Amount */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <IndianRupee size={13} /> AMOUNT *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <IndianRupee size={15} />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  required
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                EXPENSE DATE *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                PAYMENT METHOD *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
                required
              >
                <option value="CASH">CASH</option>
                <option value="BANK">BANK TRANSFER</option>
                <option value="UPI">UPI</option>
                <option value="CARD">CARD</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Vendor Name */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                VENDOR NAME (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. State Electricity Board"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Reference Number */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                REFERENCE / INVOICE NO. (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. INV-9042 / UTR12345"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              DESCRIPTION / NOTES (OPTIONAL)
            </label>
            <textarea
              rows={2}
              placeholder="Additional notes about this expense..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Receipt Attachment */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              RECEIPT ATTACHMENT (PDF, JPG, PNG)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1.5px dashed var(--line)',
                  background: 'var(--panel-alt)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                <Upload size={16} />
                {uploadingReceipt ? 'Uploading...' : 'Choose Receipt File'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              {receiptUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  <span>Receipt Attached</span>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl('')}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', marginLeft: '4px' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'none',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
