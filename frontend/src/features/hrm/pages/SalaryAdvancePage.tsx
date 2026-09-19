import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Plus, X, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { hrmApi, SalaryAdvance, SalaryAdvanceWarning, Employee } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

const STATUS_CFG: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: '#fef3c7', text: '#b45309' },
  ADJUSTED:  { bg: '#dcfce7', text: '#15803d' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
};

const curPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Warning Banner ───────────────────────────────────────────────────────────

function WarningBanner({ w, confirmed, onToggle }: { w: SalaryAdvanceWarning; confirmed: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '16px 18px', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#b45309', margin: '0 0 8px' }}>⚠️ Advance Will Make Net Pay Negative</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              ['Gross Salary', `₹${w.gross_salary.toLocaleString('en-IN')}`],
              ['Existing Advances', `₹${w.existing_advances.toLocaleString('en-IN')}`],
              ['New Advance', `₹${w.new_amount.toLocaleString('en-IN')}`],
              ['Projected Net Pay', `₹${w.projected_net.toLocaleString('en-IN')}`],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: 13 }}>
                <span style={{ color: '#92400e' }}>{k}:</span>{' '}
                <strong style={{ color: parseFloat(v.replace(/[₹,]/g, '')) < 0 ? '#dc2626' : '#b45309' }}>{v}</strong>
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#b45309' }}>
            <input type="checkbox" checked={confirmed} onChange={onToggle} style={{ width: 16, height: 16 }} />
            I understand and confirm saving this advance (net pay can be negative)
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Create Advance Modal ─────────────────────────────────────────────────────

function AdvanceModal({ isOpen, onClose, onSaved, employees }: {
  isOpen: boolean; onClose: () => void; onSaved: () => void; employees: Employee[];
}) {
  const [form, setForm] = useState({ employee_id: '', amount: '', advance_date: new Date().toISOString().slice(0, 10), reason: '', payroll_period: curPeriod() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<SalaryAdvanceWarning | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setWarning(null); setConfirmed(false); };

  useEffect(() => {
    if (isOpen) { setForm({ employee_id: '', amount: '', advance_date: new Date().toISOString().slice(0, 10), reason: '', payroll_period: curPeriod() }); setWarning(null); setConfirmed(false); setError(null); }
  }, [isOpen]);

  const handleSave = async () => {
    if (!form.employee_id || !form.amount) { setError('Employee and amount are required.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        employee_id: form.employee_id,
        amount: parseFloat(form.amount),
        advance_date: form.advance_date,
        reason: form.reason || undefined,
        payroll_period: form.payroll_period,
        confirm: confirmed,
      };
      const resp = await hrmApi.createSalaryAdvance(payload);
      if (!resp.advance && resp.warning) {
        // Warning shown — needs confirm
        setWarning(resp.warning);
        setSaving(false);
        return;
      }
      onSaved(); onClose();
    } catch (e) { setError(getErrorMessage(e, 'Failed to create advance.')); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create Salary Advance</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Employee *</label>
              <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Advance Amount (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>₹</span>
                  <input value={form.amount} onChange={e => set('amount', e.target.value)} type="number" min="1" placeholder="0" style={{ width: '100%', padding: '10px 12px 10px 26px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Payroll Period</label>
                <input value={form.payroll_period} onChange={e => set('payroll_period', e.target.value)} placeholder="2026-09" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Advance Date</label>
              <input type="date" value={form.advance_date} onChange={e => set('advance_date', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Reason</label>
              <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={2} placeholder="Reason for advance…" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            {warning && <WarningBanner w={warning} confirmed={confirmed} onToggle={() => setConfirmed(v => !v)} />}
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || (!!warning && !confirmed)}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: warning ? '#f59e0b' : '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (saving || (!!warning && !confirmed)) ? 0.6 : 1 }}>
            {saving ? 'Saving…' : warning ? 'Confirm & Save Advance' : 'Create Advance'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SalaryAdvancePage() {
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [empFilter, setEmpFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [advData, emps] = await Promise.all([
        hrmApi.getSalaryAdvances({ employee_id: empFilter || undefined, payroll_period: periodFilter || undefined }),
        hrmApi.getEmployees({ limit: 200 }),
      ]);
      setAdvances(advData);
      setEmployees(emps.items);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [empFilter, periodFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this salary advance? This cannot be undone if it is not yet adjusted.')) return;
    setCancelling(id);
    try { await hrmApi.cancelSalaryAdvance(id); fetchAll(); }
    catch (e) { alert(getErrorMessage(e, 'Failed to cancel.')); }
    finally { setCancelling(null); }
  };

  const totalPending = advances.filter(a => a.status === 'PENDING').reduce((s, a) => s + a.amount, 0);

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} color="#fff" />
            </div>
            Salary Advances
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>Manage advance payments — auto-adjusted during payroll</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
          <Plus size={16} /> Create Advance
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Pending Amount', value: `₹${totalPending.toLocaleString('en-IN')}`, color: '#b45309', bg: '#fef3c7' },
          { label: 'Pending Advances', value: advances.filter(a => a.status === 'PENDING').length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Adjusted in Payroll', value: advances.filter(a => a.status === 'ADJUSTED').length, color: '#059669', bg: '#dcfce7' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--line)', borderTop: `3px solid ${s.color}` }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} placeholder="Period (e.g. 2026-09)" style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', width: 180 }} />
      </div>

      {/* List */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--panel-alt)', borderBottom: '1px solid var(--line)' }}>
              {['Employee', 'Amount', 'Period', 'Date', 'Reason', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</td></tr>
            ) : advances.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>No advances found</td></tr>
            ) : advances.map((adv, idx) => {
              const c = STATUS_CFG[adv.status] || STATUS_CFG['CANCELLED'];
              return (
                <tr key={adv.id} style={{ borderBottom: idx < advances.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{adv.employee?.name || '—'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 15, color: '#2563eb' }}>₹{adv.amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>{adv.payroll_period}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>{adv.advance_date}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adv.reason || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: c.bg, color: c.text, borderRadius: 9999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{adv.status}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {adv.status === 'PENDING' && (
                      <button onClick={() => handleCancel(adv.id)} disabled={cancelling === adv.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
                    {adv.status === 'ADJUSTED' && <span style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> In Payroll</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdvanceModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSaved={fetchAll} employees={employees} />
    </div>
  );
}
