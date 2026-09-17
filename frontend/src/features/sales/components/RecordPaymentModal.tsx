import { useState } from 'react';
import { Calendar, CreditCard, DollarSign, FileText } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Invoice, salesApi } from '../services/salesApi';
import { getErrorMessage } from '../../../utils/error';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function RecordPaymentModal({ isOpen, onClose, invoice, onSuccess }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other'>('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = parseFloat(amount);
    if (isNaN(payNum) || payNum <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (payNum > invoice.amount_due) {
      setError(`Payment amount cannot exceed remaining amount due (₹${invoice.amount_due.toLocaleString('en-IN')}).`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await salesApi.recordPayment({
        invoice_id: invoice.id,
        amount: payNum,
        payment_date: new Date(paymentDate).toISOString(),
        payment_mode: paymentMode,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to record payment.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment — ${invoice.invoice_number}`} size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ background: '#f8fafc', border: '1px solid var(--line)', padding: '14px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
          <div>Total: <strong>₹{invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
          <div>Paid: <strong style={{ color: 'var(--success)' }}>₹{invoice.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
          <div>Remaining Due: <strong style={{ color: 'var(--danger)' }}>₹{invoice.amount_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
        </div>

        <Input
          label="Amount Paid (₹)"
          icon={<DollarSign size={14} />}
          type="number"
          step="0.01"
          max={invoice.amount_due}
          placeholder={`Max ₹${invoice.amount_due}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Select
          label="Payment Mode"
          icon={<CreditCard size={14} />}
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value as 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other')}
          required
        >
          <option value="UPI">UPI (GooglePay/PhonePe/Paytm)</option>
          <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
          <option value="Other">Other</option>
        </Select>

        <Input
          label="Payment Date"
          icon={<Calendar size={14} />}
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />

        <Input
          label="Notes / Transaction Reference"
          icon={<FileText size={14} />}
          placeholder="e.g. UTR #123456789 or Google Pay reference ID"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

