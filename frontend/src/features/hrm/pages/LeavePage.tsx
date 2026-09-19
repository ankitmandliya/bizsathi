import { useCallback, useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import { hrmApi, LeaveRequest, LeaveType, Employee } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',   bg: '#fef3c7', text: '#b45309' },
  APPROVED:  { label: 'Approved',  bg: '#dcfce7', text: '#15803d' },
  REJECTED:  { label: 'Rejected',  bg: '#fee2e2', text: '#b91c1c' },
  CANCELLED: { label: 'Cancelled', bg: '#f1f5f9', text: '#64748b' },
};

function LeaveBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG['CANCELLED'];
  return <span style={{ background: c.bg, color: c.text, borderRadius: 9999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{c.label}</span>;
}

function daysBetween(start: string, end: string) {
  const d1 = new Date(start), d2 = new Date(end);
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

// ─── Apply Leave Modal ────────────────────────────────────────────────────────

function ApplyLeaveModal({ isOpen, onClose, onSaved, employees, leaveTypes }: {
  isOpen: boolean; onClose: () => void; onSaved: () => void;
  employees: Employee[]; leaveTypes: LeaveType[];
}) {
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isOpen) { setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' }); setError(null); }
  }, [isOpen]);

  const days = form.start_date && form.end_date ? daysBetween(form.start_date, form.end_date) : 0;

  const handleSave = async () => {
    if (!form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date) { setError('All fields are required.'); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { setError('End date must be after start date.'); return; }
    setSaving(true); setError(null);
    try {
      await hrmApi.createLeaveRequest(form);
      onSaved(); onClose();
    } catch (e) { setError(getErrorMessage(e, 'Failed to apply leave.')); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Apply for Leave</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{error}</div>}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Employee *</label>
            <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Leave Type *</label>
            <select value={form.leave_type_id} onChange={e => set('leave_type_id', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
              <option value="">Select Type</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} {lt.is_paid ? '(Paid)' : '(Unpaid)'}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>End Date *</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {days > 0 && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
              📅 {days} day{days > 1 ? 's' : ''} leave requested
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Reason (Optional)</label>
            <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={3} placeholder="Reason for leave…" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Submitting…' : 'Submit Leave Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqData, types, emps] = await Promise.all([
        hrmApi.getLeaveRequests({ limit: 200 }),
        hrmApi.getLeaveTypes(),
        hrmApi.getEmployees({ limit: 200 }),
      ]);
      setRequests(reqData.items);
      setLeaveTypes(types);
      setEmployees(emps.items);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try { await hrmApi.approveLeave(id); fetchAll(); }
    catch (e) { alert(getErrorMessage(e, 'Failed to approve.')); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try { await hrmApi.rejectLeave(id); fetchAll(); }
    catch (e) { alert(getErrorMessage(e, 'Failed to reject.')); }
    finally { setActionLoading(null); }
  };

  const pending = requests.filter(r => r.status === 'PENDING');
  const displayed = tab === 'pending' ? pending : requests;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#fff" />
            </div>
            Leave Management
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>Apply leave and manage approvals</p>
        </div>
        <button onClick={() => setIsApplyOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Pending Approval', value: pending.length, bg: '#fef3c7', color: '#b45309' },
          { label: 'Approved', value: requests.filter(r => r.status === 'APPROVED').length, bg: '#dcfce7', color: '#15803d' },
          { label: 'Rejected', value: requests.filter(r => r.status === 'REJECTED').length, bg: '#fee2e2', color: '#b91c1c' },
          { label: 'Total Requests', value: requests.length, bg: '#eff6ff', color: '#1d4ed8' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--line)', borderLeft: `3px solid ${s.color}` }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {[['pending', `Pending Approval (${pending.length})`], ['all', 'All Requests']] .map(([t, label]) => (
          <button key={t} onClick={() => setTab(t as typeof tab)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: tab === t ? 'var(--primary)' : 'var(--muted)', borderBottom: `2px solid ${tab === t ? 'var(--primary)' : 'transparent'}`, marginBottom: -1, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <Calendar size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>No {tab === 'pending' ? 'pending' : ''} requests</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(req => {
            const days = daysBetween(req.start_date, req.end_date);
            return (
              <div key={req.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{req.employee?.name || '—'}</p>
                    <LeaveBadge status={req.status} />
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                    {req.leave_type?.name || '—'} &nbsp;·&nbsp;
                    {req.start_date} → {req.end_date} ({days} day{days > 1 ? 's' : ''})
                  </p>
                  {req.reason && <p style={{ color: 'var(--muted)', fontSize: 12, margin: '4px 0 0', fontStyle: 'italic' }}>"{req.reason}"</p>}
                </div>
                {req.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ApplyLeaveModal isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} onSaved={fetchAll} employees={employees} leaveTypes={leaveTypes} />
    </div>
  );
}
