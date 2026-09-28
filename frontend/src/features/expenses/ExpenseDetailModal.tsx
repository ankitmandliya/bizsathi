import React from 'react';
import { X, Calendar, CreditCard, Tag, User, FileText, Download, IndianRupee } from 'lucide-react';
import { Expense } from './services/expensesApi';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

export function ExpenseDetailModal({ isOpen, onClose, expense }: ExpenseDetailModalProps) {
  if (!isOpen || !expense) return null;

  const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const fullReceiptUrl = expense.receipt_url
    ? expense.receipt_url.startsWith('http')
      ? expense.receipt_url
      : `${backendUrl}${expense.receipt_url}`
    : null;

  const isPdf = expense.receipt_url?.toLowerCase().endsWith('.pdf');

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
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {expense.category_name}
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0 0', color: 'var(--text)' }}>
              {expense.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Amount Box */}
          <div
            style={{
              background: 'var(--panel-alt)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Expense Amount
            </span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              <IndianRupee size={26} />
              {expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Paid via <strong>{expense.payment_method}</strong>
            </span>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                EXPENSE DATE
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {new Date(expense.expense_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                VENDOR NAME
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{expense.vendor_name || '—'}</span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                REFERENCE / INVOICE NO.
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{expense.reference_number || '—'}</span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                RECORDED BY
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{expense.created_by_name || 'System User'}</span>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div
              style={{
                background: 'var(--panel-alt)',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                color: 'var(--text)',
                marginBottom: '20px',
                border: '1px solid var(--line)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--muted)' }}>
                Description / Notes:
              </strong>
              {expense.description}
            </div>
          )}

          {/* Receipt Preview */}
          {fullReceiptUrl && (
            <div style={{ marginTop: '20px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                Receipt Attachment:
              </strong>
              {isPdf ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a
                    href={fullReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: '#4f46e5',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    <Download size={16} /> View PDF Receipt
                  </a>
                </div>
              ) : (
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img
                    src={fullReceiptUrl}
                    alt="Receipt"
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', background: '#f8fafc' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
