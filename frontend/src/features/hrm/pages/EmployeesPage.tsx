import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Search, UserCheck, UserX, Users,
  Edit2, Trash2, X, IndianRupee, Key
} from 'lucide-react';
import { hrmApi, Employee, Department, Designation, SalaryStructure } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Active':   { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  'On Leave': { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  'Inactive': { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
};

const EMP_TYPE_COLORS: Record<string, string> = {
  'Full-time': '#eff6ff',
  'Part-time': '#f5f3ff',
  'Contract':  '#fff7ed',
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Inactive'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.text, borderRadius: 9999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: 38, height: 38, borderRadius: 10, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Add/Edit Employee Modal ──────────────────────────────────────────────────

function EmployeeModal({
  isOpen, onClose, onSaved, departments, designations, employee
}: {
  isOpen: boolean; onClose: () => void; onSaved: () => void;
  departments: Department[]; designations: Designation[]; employee?: Employee | null;
}) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    name: '', email: '', phone: '', department_id: '', designation_id: '',
    joining_date: '', employment_type: 'Full-time', status: 'Active',
    emergency_contact_name: '', emergency_contact_phone: '',
    bank_account_number: '', bank_ifsc: '', pf_number: '', esi_number: '',
    give_login_access: false, username: '', password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'login' | 'bank' | 'compliance'>('basic');

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department_id: employee.department_id || '',
        designation_id: employee.designation_id || '',
        joining_date: employee.joining_date || '',
        employment_type: employee.employment_type || 'Full-time',
        status: employee.status || 'Active',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        bank_account_number: employee.bank_account_number || '',
        bank_ifsc: employee.bank_ifsc || '',
        pf_number: employee.pf_number || '',
        esi_number: employee.esi_number || '',
        give_login_access: false,
        username: employee.email || '',
        password: '',
      });
    } else {
      setForm({
        name:'',email:'',phone:'',department_id:'',designation_id:'',joining_date:'',
        employment_type:'Full-time',status:'Active',emergency_contact_name:'',emergency_contact_phone:'',
        bank_account_number:'',bank_ifsc:'',pf_number:'',esi_number:'',
        give_login_access: false, username: '', password: ''
      });
    }
    setActiveTab('basic');
    setError(null);
  }, [employee, isOpen]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Employee name is required.'); return; }
    if (form.give_login_access && (!form.username.trim() || !form.password.trim())) {
      setError('Username and password are required when giving login access.');
      return;
    }
    setSaving(true); setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.give_login_access) {
        delete payload.username;
        delete payload.password;
        delete payload.give_login_access;
      }
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k]; });

      if (isEdit && employee) {
        await hrmApi.updateEmployee(employee.id, payload);
      } else {
        await hrmApi.createEmployee(payload);
      }
      onSaved();
      onClose();
    } catch (e) { setError(getErrorMessage(e, 'Failed to save employee.')); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'login', label: 'Login Access' },
    { id: 'bank', label: 'Bank & Emergency' },
    { id: 'compliance', label: 'PF / ESI' },
  ] as const;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', background: activeTab === t.id ? 'var(--primary)' : 'transparent', color: activeTab === t.id ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {activeTab === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.give_login_access}
                    onChange={e => setForm(f => ({ ...f, give_login_access: e.target.checked, username: f.username || f.email }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  Give Employee Login Access
                </label>
                <p style={{ margin: '6px 0 0 28px', fontSize: 13, color: 'var(--muted)' }}>
                  Allows employee to log in directly to check in/out, apply for leave, and view payslips.
                </p>
              </div>

              {form.give_login_access && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                    ℹ️ No email is sent. Set credentials directly and communicate them to the employee.
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Username / Login Email *</label>
                    <input
                      value={form.username}
                      onChange={e => set('username', e.target.value)}
                      placeholder="e.g. employee@company.com"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password *</label>
                    <input
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      type="password"
                      placeholder="Initial password"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>पूरा नाम (Full Name) *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email</label>
                  <input value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="email@company.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Department</label>
                  <select value={form.department_id} onChange={e => set('department_id', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Designation</label>
                  <select value={form.designation_id} onChange={e => set('designation_id', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
                    <option value="">Select Designation</option>
                    {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Joining Date</label>
                  <input value={form.joining_date} onChange={e => set('joining_date', e.target.value)} type="date" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Type</label>
                  <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
                    <option>Full-time</option><option>Part-time</option><option>Contract</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)' }}>
                    <option>Active</option><option>On Leave</option><option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Bank Account Number</label>
                  <input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="Account number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>IFSC Code</label>
                  <input value={form.bank_ifsc} onChange={e => set('bank_ifsc', e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Emergency Contact Name</label>
                  <input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} placeholder="Contact name" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Emergency Contact Phone</label>
                  <input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>
                ℹ️ PF and ESI numbers are stored for reference only. Compliance calculations are not automated in V1.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>PF Number (Optional)</label>
                  <input value={form.pf_number} onChange={e => set('pf_number', e.target.value)} placeholder="UAN / PF account number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>ESI Number (Optional)</label>
                  <input value={form.esi_number} onChange={e => set('esi_number', e.target.value)} placeholder="ESI IP number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Salary Structure Modal ───────────────────────────────────────────────────

function SalaryModal({ isOpen, onClose, onSaved, employee }: { isOpen: boolean; onClose: () => void; onSaved: () => void; employee: Employee | null; }) {
  const [form, setForm] = useState({ basic: '', hra: '', other_allowances: '', other_deductions: '', effective_from: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);

  useEffect(() => {
    if (isOpen && employee) {
      hrmApi.getSalaryStructures(employee.id).then(s => setStructures(s)).catch(() => {});
      setForm({ basic: '', hra: '', other_allowances: '', other_deductions: '', effective_from: new Date().toISOString().slice(0, 10) });
      setError(null);
    }
  }, [isOpen, employee]);

  const gross = (parseFloat(form.basic) || 0) + (parseFloat(form.hra) || 0) + (parseFloat(form.other_allowances) || 0);
  const net = gross - (parseFloat(form.other_deductions) || 0);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!employee) return;
    if (!form.basic) { setError('Basic salary is required.'); return; }
    setSaving(true); setError(null);
    try {
      await hrmApi.setSalaryStructure(employee.id, { basic: parseFloat(form.basic), hra: parseFloat(form.hra) || 0, other_allowances: parseFloat(form.other_allowances) || 0, other_deductions: parseFloat(form.other_deductions) || 0, effective_from: form.effective_from });
      onSaved();
      onClose();
    } catch (e) { setError(getErrorMessage(e, 'Failed to save salary.')); }
    finally { setSaving(false); }
  };

  if (!isOpen || !employee) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Set Salary Structure</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{employee.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {structures.length > 0 && (
            <div style={{ background: 'var(--panel-alt)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-2)' }}>Current: ₹{(structures[0].basic + structures[0].hra + structures[0].other_allowances).toLocaleString('en-IN')}/month</p>
              <p style={{ color: 'var(--muted)' }}>Effective from {structures[0].effective_from}. Adding new structure will create a new dated row.</p>
            </div>
          )}
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['basic', 'Basic Salary *'], ['hra', 'HRA'], ['other_allowances', 'Other Allowances'], ['other_deductions', 'Other Deductions']].map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>₹</span>
                  <input value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)} type="number" min="0" style={{ width: '100%', padding: '10px 12px 10px 26px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Effective From</label>
            <input value={form.effective_from} onChange={e => set('effective_from', e.target.value)} type="date" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {gross > 0 && (
            <div style={{ marginTop: 16, background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                <span>Gross Salary</span><span style={{ fontWeight: 700, color: '#2563eb' }}>₹{gross.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: net >= 0 ? '#15803d' : '#b91c1c' }}>
                <span>Net Payable</span><span>₹{net.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Set Salary'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Login Modal ────────────────────────────────────────────────────────

function SetupLoginModal({ isOpen, onClose, onSaved, employee }: { isOpen: boolean; onClose: () => void; onSaved: () => void; employee: Employee | null; }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Standard Employee' | 'HR Manager' | 'Admin'>('Standard Employee');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setUsername(employee.email || '');
      setPassword('');
      setRole('Standard Employee');
      setError(null);
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and Password are required.');
      return;
    }
    setSaving(true); setError(null);
    try {
      await hrmApi.setupLogin(employee.id, username.trim(), password.trim(), role);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to setup login credentials.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Setup Login Access for {employee.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{error}</div>}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
            ℹ️ HR sets credentials directly. Communicate password to employee after saving.
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Username / Email *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password *</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>System Access Role</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-card)', color: 'var(--text)' }}>
              <option value="Standard Employee">Standard Employee (Self-Service Only)</option>
              <option value="HR Manager">HR Manager (Full HRMS Access)</option>
              <option value="Admin">Admin (Full System Access)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Set Up Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [loginEmployee, setLoginEmployee] = useState<Employee | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [empData, depts, desigs] = await Promise.all([
        hrmApi.getEmployees({ search: search || undefined, department_id: deptFilter || undefined, status: statusFilter || undefined, limit: 100 }),
        hrmApi.getDepartments(),
        hrmApi.getDesignations(),
      ]);
      setEmployees(empData.items);
      setTotal(empData.total);
      setDepartments(depts);
      setDesignations(desigs);
    } catch (e) { setError(getErrorMessage(e, 'Failed to load employees.')); }
    finally { setLoading(false); }
  }, [search, deptFilter, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.name} from the system?`)) return;
    try { await hrmApi.deleteEmployee(emp.id); fetchAll(); }
    catch (e) { alert(getErrorMessage(e, 'Failed to remove employee.')); }
  };

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const onLeaveCount = employees.filter(e => e.status === 'On Leave').length;

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#fff" />
            </div>
            Employees
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>Manage your team — add, edit, set salaries, and configure login access</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <Users size={18} color="#6366f1" />, label: 'Total Employees', value: total, bg: '#eff6ff', accent: '#6366f1' },
          { icon: <UserCheck size={18} color="#059669" />, label: 'Active', value: activeCount, bg: '#dcfce7', accent: '#059669' },
          { icon: <UserX size={18} color="#f59e0b" />, label: 'On Leave', value: onLeaveCount, bg: '#fef3c7', accent: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.accent, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone…" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', background: 'var(--bg-card)', color: 'var(--text)' }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', background: 'var(--bg-card)', color: 'var(--text)' }}>
          <option value="">All Status</option>
          <option>Active</option><option>On Leave</option><option>Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading employees…</div>
      ) : error ? (
        <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 10, padding: 20, textAlign: 'center' }}>{error}</div>
      ) : employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <Users size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>No employees found</p>
          <p style={{ fontSize: 13 }}>Click "Add Employee" to get started</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--panel-alt)', borderBottom: '1px solid var(--line)' }}>
                {['Employee', 'Department', 'Type', 'Joining Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} style={{ borderBottom: idx < employees.length - 1 ? '1px solid var(--line)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={emp.name} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{emp.name}</p>
                          {emp.user_id && (
                            <span title="Login access active" style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 4 }}>Login Active</span>
                          )}
                        </div>
                        <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>{emp.email || emp.phone || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500 }}>{emp.department?.name || '—'}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{emp.designation?.name || ''}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: EMP_TYPE_COLORS[emp.employment_type] || '#f1f5f9', padding: '3px 10px', borderRadius: 6 }}>
                      {emp.employment_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{emp.joining_date || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={emp.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setSalaryEmployee(emp)} title="Set Salary" style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #dcfce7', background: '#f0fdf4', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <IndianRupee size={14} />
                      </button>
                      <button onClick={() => setLoginEmployee(emp)} title="Set Up Login Access" style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e0e7ff', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Key size={14} />
                      </button>
                      <button onClick={() => setEditEmployee(emp)} title="Edit" style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(emp)} title="Remove" style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSaved={fetchAll} departments={departments} designations={designations} />
      <EmployeeModal isOpen={!!editEmployee} onClose={() => setEditEmployee(null)} onSaved={fetchAll} departments={departments} designations={designations} employee={editEmployee} />
      <SalaryModal isOpen={!!salaryEmployee} onClose={() => setSalaryEmployee(null)} onSaved={fetchAll} employee={salaryEmployee} />
      <SetupLoginModal isOpen={!!loginEmployee} onClose={() => setLoginEmployee(null)} onSaved={fetchAll} employee={loginEmployee} />
    </div>
  );
}

