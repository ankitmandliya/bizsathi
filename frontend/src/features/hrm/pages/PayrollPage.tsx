import { useCallback, useEffect, useState } from 'react';
import { Play, FileText, Download, CheckCircle, IndianRupee, X } from 'lucide-react';
import { hrmApi, Payroll, Payslip } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

const curPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtPeriod = (p: string) => {
  try {
    const [y, m] = p.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch { return p; }
};

// ─── Run Payroll Modal ────────────────────────────────────────────────────────

function RunPayrollModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [period, setPeriod] = useState(curPeriod());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isOpen) { setPeriod(curPeriod()); setError(null); } }, [isOpen]);

  const handleRun = async () => {
    if (!period.match(/^\d{4}-\d{2}$/)) { setError('Period must be in YYYY-MM format (e.g. 2026-09).'); return; }
    if (!confirm(`Run payroll for ${fmtPeriod(period)}? This will process all active employees and mark pending advances as adjusted.`)) return;
    setRunning(true); setError(null);
    try {
      await hrmApi.runPayroll(period);
      onSaved(); onClose();
    } catch (e) { setError(getErrorMessage(e, 'Failed to run payroll.')); }
    finally { setRunning(false); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Run Payroll</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
            ⚠️ Payroll run is <strong>irreversible</strong> once processed. All pending salary advances for this period will be adjusted (frozen).
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Payroll Period (YYYY-MM)</label>
          <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. 2026-09" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 2 }} />
          {period.match(/^\d{4}-\d{2}$/) && (
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 14, color: '#2563eb', fontWeight: 600 }}>{fmtPeriod(period)}</p>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleRun} disabled={running} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: running ? 0.7 : 1 }}>
            <Play size={14} /> {running ? 'Running…' : 'Run Payroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payslip Detail Modal ─────────────────────────────────────────────────────

function getInitials(name?: string) {
  if (!name) return 'EMP';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EMP';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PayslipModal({ payslip, period, onClose }: { payslip: Payslip; period: string; onClose: () => void }) {
  const openPdf = () => {
    window.open(hrmApi.getPayslipPdfUrl(payslip.id), '_blank');
  };

  const basic = payslip.basic || 0;
  const hra = payslip.hra || 0;
  const other_allowances = payslip.other_allowances || 0;
  const gross = payslip.gross_salary || 0;
  const unpaid_days = payslip.unpaid_absence_days || 0;
  const unpaid_ded = payslip.unpaid_absence_deduction || 0;
  const advance_ded = payslip.salary_advance_deduction || 0;
  const other_ded = payslip.other_deductions || 0;
  const net = payslip.net_payable || 0;

  const rows = [
    { label: 'Basic Salary', value: basic },
    { label: 'HRA (House Rent Allowance)', value: hra },
    { label: 'Other Allowances', value: other_allowances },
  ];
  const deductions = [
    { label: `Unpaid Absence (${unpaid_days} days)`, value: -unpaid_ded },
    { label: 'Salary Advance Adjusted', value: -advance_ded },
    { label: 'Other Deductions', value: -other_ded },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Payslip — {fmtPeriod(period)}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{payslip.employee?.name || '—'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openPdf} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Download size={14} /> PDF
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><X size={20} /></button>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {/* Earnings */}
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>EARNINGS</p>
          <div style={{ background: 'var(--panel-alt)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 14 }}>
                <span style={{ color: 'var(--text-2)' }}>{r.label}</span>
                <span style={{ fontWeight: 700 }}>₹{r.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#eff6ff', fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: '#1d4ed8' }}>Gross Salary</span>
              <span style={{ color: '#1d4ed8' }}>₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Deductions */}
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>DEDUCTIONS</p>
          <div style={{ background: 'var(--panel-alt)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {deductions.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < deductions.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 14 }}>
                <span style={{ color: 'var(--text-2)' }}>{d.label}</span>
                <span style={{ fontWeight: 700, color: d.value < 0 ? '#dc2626' : 'var(--text)' }}>
                  {d.value < 0 ? `- ₹${Math.abs(d.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${d.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            ))}
          </div>

          {/* Net Pay */}
          <div style={{ borderRadius: 12, padding: '18px 20px', background: net >= 0 ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #fee2e2, #fecaca)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: net >= 0 ? '#15803d' : '#b91c1c', margin: 0 }}>NET PAYABLE</p>
              <p style={{ fontSize: 11, color: net >= 0 ? '#166534' : '#991b1b', margin: '2px 0 0' }}>Working days: {payslip.working_days_in_period || 0}</p>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: net >= 0 ? '#15803d' : '#b91c1c', margin: 0 }}>
              ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunOpen, setIsRunOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const d = await hrmApi.getPayrolls({ limit: 24 });
      setPayrolls(d.items || []);
      if (d.items && d.items.length > 0 && !selectedPayroll) {
        loadPayslips(d.items[0]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  const loadPayslips = async (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setPayslips([]);
    setLoadingPayslips(true);
    try {
      const res = await hrmApi.getPayslips(payroll.id);
      setPayslips(res || []);
    } catch { /* silent */ }
    finally { setLoadingPayslips(false); }
  };

  const totalNetPayable = payslips.reduce((s, p) => s + (p?.net_payable || 0), 0);

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} color="#fff" />
            </div>
            Payroll
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>Run monthly payroll and download payslips</p>
        </div>
        <button onClick={() => setIsRunOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
          <Play size={15} /> Run Payroll
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Payroll Run List */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>PAYROLL RUNS</p>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Loading…</div>
            ) : payrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <Play size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>No payroll runs yet</p>
                <p style={{ fontSize: 12 }}>Click "Run Payroll" to start</p>
              </div>
            ) : payrolls.map((p, idx) => (
              <div key={p.id} onClick={() => loadPayslips(p)}
                style={{ padding: '14px 16px', borderBottom: idx < payrolls.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', background: selectedPayroll?.id === p.id ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (selectedPayroll?.id !== p.id) e.currentTarget.style.background = 'var(--panel-hover)'; }}
                onMouseLeave={e => { if (selectedPayroll?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: selectedPayroll?.id === p.id ? 'var(--primary)' : 'var(--text)' }}>{fmtPeriod(p.payroll_period)}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.status === 'PROCESSED' ? '#15803d' : '#b45309', background: p.status === 'PROCESSED' ? '#dcfce7' : '#fef3c7', borderRadius: 9999, padding: '2px 8px' }}>
                    {p.status}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{p.payslip_count} employees · {p.payroll_period}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payslips Panel */}
        <div>
          {!selectedPayroll ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
              <FileText size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>Select a payroll run</p>
              <p style={{ fontSize: 13 }}>Click on a month from the left to view payslips</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{fmtPeriod(selectedPayroll.payroll_period)} — Payslips</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>
                    {payslips.length} employees &nbsp;·&nbsp;
                    Total Net Payable: <strong style={{ color: totalNetPayable >= 0 ? '#059669' : '#dc2626' }}>₹{totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {selectedPayroll.status === 'PROCESSED' && <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 9999, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Processed</span>}
                </div>
              </div>
              {loadingPayslips ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading payslips…</div>
              ) : payslips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)' }}>No payslips found</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {payslips.map(ps => {
                    const empName = ps.employee?.name || 'Employee';
                    const initials = getInitials(empName);
                    const gross = (ps.gross_salary || 0).toLocaleString('en-IN');
                    const netVal = ps.net_payable || 0;
                    const netDisplay = netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const absentDays = ps.unpaid_absence_days || 0;

                    return (
                      <div key={ps.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                        onClick={() => setSelectedPayslip(ps)}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{empName}</p>
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>
                            Gross ₹{gross} &nbsp;·&nbsp; {absentDays} absent days
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, fontSize: 16, color: netVal >= 0 ? '#059669' : '#dc2626', margin: 0 }}>₹{netDisplay}</p>
                          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>Net Payable</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); window.open(hrmApi.getPayslipPdfUrl(ps.id), '_blank'); }}
                          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #eff6ff', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                          <Download size={13} /> PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <RunPayrollModal isOpen={isRunOpen} onClose={() => setIsRunOpen(false)} onSaved={fetchPayrolls} />
      {selectedPayslip && selectedPayroll && (
        <PayslipModal payslip={selectedPayslip} period={selectedPayroll.payroll_period} onClose={() => setSelectedPayslip(null)} />
      )}
    </div>
  );
}
