import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Moon, Coffee,
  Edit2, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight,
  User, Filter
} from 'lucide-react';
import { hrmApi, Attendance, Employee, Department, WorkSchedule } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

// ─── Status config ────────────────────────────────────────────────────────────

const ATT_STATUS: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PRESENT:  { label: 'Present',  bg: '#dcfce7', text: '#15803d', icon: <CheckCircle2 size={12} /> },
  LATE:     { label: 'Late',     bg: '#fef3c7', text: '#b45309', icon: <Clock size={12} /> },
  HALF_DAY: { label: 'Half Day', bg: '#fff7ed', text: '#c2410c', icon: <Coffee size={12} /> },
  ABSENT:   { label: 'Absent',   bg: '#fee2e2', text: '#b91c1c', icon: <AlertCircle size={12} /> },
  LEAVE:    { label: 'On Leave', bg: '#ede9fe', text: '#7c3aed', icon: <Moon size={12} /> },
};

function AttBadge({ status }: { status: string }) {
  const cfg = ATT_STATUS[status] || { label: status, bg: '#f1f5f9', text: '#64748b', icon: null };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cfg.bg, color: cfg.text, borderRadius: 9999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtMins(mins?: number) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}h ${m}m`;
}

// ─── Live Timer Card ──────────────────────────────────────────────────────────

function CheckInCard({ employees, onRefresh }: { employees: Employee[]; onRefresh: () => void }) {
  const [selectedEmp, setSelectedEmp] = useState('');
  const [todayAtt, setTodayAtt] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!selectedEmp && employees.length > 0) {
      setSelectedEmp(employees[0].id);
    }
  }, [employees, selectedEmp]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (!selectedEmp) { setTodayAtt(null); return; }
    const today = new Date().toISOString().slice(0, 10);
    hrmApi.getAttendance({ employee_id: selectedEmp, date_from: today, date_to: today, limit: 1 })
      .then(d => setTodayAtt(d.items[0] || null))
      .catch(() => {});
  }, [selectedEmp]);

  const duration = todayAtt?.check_in_at
    ? Math.floor((now.getTime() - new Date(todayAtt.check_in_at).getTime()) / 60000)
    : null;

  const handleCheckIn = async () => {
    if (!selectedEmp) { setError('Please select an employee first.'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const att = await hrmApi.checkIn(selectedEmp);
      setTodayAtt(att);
      setSuccess('Check-in successful!');
      onRefresh();
    } catch (e) { setError(getErrorMessage(e, 'Check-in failed.')); }
    finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!todayAtt) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const att = await hrmApi.checkOut(todayAtt.id);
      setTodayAtt(att);
      setSuccess('Check-out successful!');
      onRefresh();
    } catch (e) { setError(getErrorMessage(e, 'Check-out failed.')); }
    finally { setLoading(false); }
  };

  const canCheckIn = !todayAtt?.check_in_at;
  const canCheckOut = !!todayAtt?.check_in_at && !todayAtt?.check_out_at;

  return (
    <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: 16, padding: 28, color: '#fff', position: 'relative', overflow: 'hidden', marginBottom: 28 }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(99,102,241,0.15)' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(16,185,129,0.1)' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🕐 Attendance Check-In</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 700, color: '#f1f5f9', letterSpacing: 2 }}>
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>SELECT EMPLOYEE</label>
            <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', backdropFilter: 'blur(10px)' }}>
              <option value="" style={{ background: '#1e293b' }}>Choose employee…</option>
              {employees.map(e => <option key={e.id} value={e.id} style={{ background: '#1e293b' }}>{e.name}</option>)}
            </select>

            {todayAtt && (
              <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Check-in: <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmtTime(todayAtt.check_in_at)}</span></div>
                {todayAtt.check_out_at && <div style={{ fontSize: 13, color: '#94a3b8' }}>Check-out: <span style={{ color: '#f87171', fontWeight: 700 }}>{fmtTime(todayAtt.check_out_at)}</span></div>}
                {duration !== null && !todayAtt.check_out_at && <div style={{ fontSize: 13, color: '#94a3b8' }}>Duration: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmtMins(duration)}</span></div>}
                <AttBadge status={todayAtt.status} />
              </div>
            )}
            {success && <p style={{ color: '#4ade80', fontSize: 13, margin: '8px 0 0', fontWeight: 600 }}>{success}</p>}
            {error && <p style={{ color: '#fca5a5', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleCheckIn} disabled={!canCheckIn || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, border: 'none', background: canCheckIn ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: canCheckIn ? 'pointer' : 'not-allowed', opacity: canCheckIn ? 1 : 0.5, transition: 'all 0.2s', boxShadow: canCheckIn ? '0 4px 14px rgba(34,197,94,0.4)' : 'none' }}>
              <LogIn size={16} /> Check In
            </button>
            <button onClick={handleCheckOut} disabled={!canCheckOut || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, border: 'none', background: canCheckOut ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: canCheckOut ? 'pointer' : 'not-allowed', opacity: canCheckOut ? 1 : 0.5, transition: 'all 0.2s', boxShadow: canCheckOut ? '0 4px 14px rgba(249,115,22,0.4)' : 'none' }}>
              <LogOut size={16} /> Check Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Attendance Modal ────────────────────────────────────────────────────

function EditAttModal({ att, onClose, onSaved }: { att: Attendance; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    check_in_at: att.check_in_at ? new Date(att.check_in_at).toISOString().slice(0, 16) : '',
    check_out_at: att.check_out_at ? new Date(att.check_out_at).toISOString().slice(0, 16) : '',
    status: att.status,
    remarks: att.remarks || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | undefined> = {};
      if (form.check_in_at) payload.check_in_at = new Date(form.check_in_at).toISOString();
      if (form.check_out_at) payload.check_out_at = new Date(form.check_out_at).toISOString();
      if (form.status) payload.status = form.status;
      if (form.remarks) payload.remarks = form.remarks;
      await hrmApi.updateAttendance(att.id, payload);
      onSaved();
      onClose();
    } catch (e) { alert(getErrorMessage(e, 'Failed to save.')); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Attendance</h3>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{att.employee?.name} — {att.attendance_date}</p>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['check_in_at', 'Check-in Time'], ['check_out_at', 'Check-out Time']].map(([key, label]) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{label}</label>
              <input type="datetime-local" value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Status Override</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }}>
              {['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Remarks (Reason for correction)</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View Component ──────────────────────────────────────────────────

function AttendanceCalendarView({
  attendance,
  employees,
  empFilter,
  workSchedule,
  onSelectEdit,
}: {
  attendance: Attendance[];
  employees: Employee[];
  empFilter: string;
  workSchedule: WorkSchedule | null;
  onSelectEdit: (att: Attendance) => void;
}) {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);

  // Parse working days from Business Settings (0=Mon, 1=Tue, ..., 5=Sat, 6=Sun)
  const workingDaysList = workSchedule?.working_days
    ? workSchedule.working_days.split(',').map(d => d.trim())
    : ['0', '1', '2', '3', '4']; // Default Mon-Fri

  // Map JS getDay() (0=Sun, 1=Mon, ..., 6=Sat) to Business Settings day ID ('0'=Mon, ..., '5'=Sat, '6'=Sun)
  const getWorkDayId = (jsDay: number): string => String((jsDay + 6) % 7);

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
  };

  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create grid items
  const gridCells = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    gridCells.push(d);
  }

  const selectedEmpName = employees.find(e => e.id === empFilter)?.name;
  const isCurrentMonthView = currentYear === todayYear && currentMonth === todayMonth;

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      {/* Calendar Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            📅 {monthNames[currentMonth - 1]} {currentYear}
          </h2>
          {selectedEmpName && (
            <span style={{ fontSize: 13, background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '3px 10px', borderRadius: 9999, fontWeight: 600 }}>
              {selectedEmpName}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel-alt)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <ChevronLeft size={16} /> Prev
          </button>
          <button onClick={() => { setCurrentYear(2026); setCurrentMonth(8); }} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel-alt)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Aug 2026
          </button>
          <button
            onClick={() => { const now = new Date(); setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth() + 1); }}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: isCurrentMonthView ? '1.5px solid #2563eb' : '1px solid var(--line)',
              background: isCurrentMonthView ? 'rgba(37, 99, 235, 0.1)' : 'var(--panel-alt)',
              color: isCurrentMonthView ? '#2563eb' : 'var(--text)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Today
          </button>
          <button onClick={nextMonth} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel-alt)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8, textAlign: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
          const isWorking = workingDaysList.includes(getWorkDayId(idx));
          return (
            <div key={day} style={{ fontSize: 12, fontWeight: 700, color: !isWorking ? '#ef4444' : 'var(--muted)', textTransform: 'uppercase', padding: '6px 0' }}>
              {day}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {gridCells.map((dayNum, index) => {
          if (dayNum === null) {
            return <div key={`empty-${index}`} style={{ minHeight: 90, background: 'var(--panel-alt)', borderRadius: 10, opacity: 0.3 }} />;
          }

          const dayOfWeek = (startingDayOfWeek + dayNum - 1) % 7;
          const dayId = getWorkDayId(dayOfWeek);
          const isWorkingDay = workingDaysList.includes(dayId);
          const isOffDay = !isWorkingDay;
          const isToday = isCurrentMonthView && dayNum === todayDay;

          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

          // Attendance for this day
          const dayAtts = attendance.filter(a => a.attendance_date === dateStr);

          // Single employee attendance or summary counts
          const empAtt = empFilter ? dayAtts.find(a => a.employee_id === empFilter) : null;

          const pCount = dayAtts.filter(a => a.status === 'PRESENT').length;
          const lCount = dayAtts.filter(a => a.status === 'LATE').length;
          const hdCount = dayAtts.filter(a => a.status === 'HALF_DAY').length;
          const absCount = dayAtts.filter(a => a.status === 'ABSENT').length;
          const lvCount = dayAtts.filter(a => a.status === 'LEAVE').length;

          return (
            <div key={dateStr}
              style={{
                minHeight: 95,
                background: isToday
                  ? 'rgba(37, 99, 235, 0.08)'
                  : isOffDay
                  ? 'rgba(0,0,0,0.02)'
                  : 'var(--bg-card)',
                borderRadius: 10,
                border: isToday
                  ? '2px solid #2563eb'
                  : '1px solid var(--line)',
                boxShadow: isToday ? '0 0 12px rgba(37, 99, 235, 0.25)' : 'none',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#2563eb' : isOffDay ? '#94a3b8' : 'var(--text)' }}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#2563eb', color: '#ffffff', padding: '1px 5px', borderRadius: 4, letterSpacing: '0.05em' }}>
                      TODAY
                    </span>
                  )}
                </div>
                {isOffDay && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Off</span>}
              </div>

              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {empFilter ? (
                  // Individual Employee View
                  empAtt ? (
                    <div onClick={() => onSelectEdit(empAtt)} style={{ cursor: 'pointer' }}>
                      <AttBadge status={empAtt.status} />
                      {empAtt.check_in_at && (
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          in: {fmtTime(empAtt.check_in_at)}
                        </div>
                      )}
                    </div>
                  ) : (
                    !isOffDay && <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                  )
                ) : (
                  // Summary All Employees View
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {(pCount + lCount) > 0 && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{pCount + lCount} P</span>}
                    {hdCount > 0 && <span style={{ fontSize: 10, background: '#fff7ed', color: '#c2410c', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{hdCount} HD</span>}
                    {absCount > 0 && <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{absCount} A</span>}
                    {lvCount > 0 && <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{lvCount} L</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [editAtt, setEditAtt] = useState<Attendance | null>(null);
  const [empFilter, setEmpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // Set default date range to cover August 2026 through current month
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-09-30');

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const [attData, emps, depts, sched] = await Promise.all([
        hrmApi.getAttendance({ employee_id: empFilter || undefined, date_from: dateFrom, date_to: dateTo, status: statusFilter || undefined, department_id: deptFilter || undefined, limit: 500 }),
        hrmApi.getEmployees({ limit: 200 }),
        hrmApi.getDepartments(),
        hrmApi.getWorkSchedule(),
      ]);
      setAttendance(attData.items);
      setEmployees(emps.items);
      setDepartments(depts);
      setWorkSchedule(sched);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [empFilter, statusFilter, deptFilter, dateFrom, dateTo]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const presentCount = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentCount = attendance.filter(a => a.status === 'ABSENT').length;

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#fff" />
            </div>
            Attendance
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>Track employee attendance, check-ins, monthly calendar, and corrections</p>
        </div>

        {/* View Switcher Toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--panel-alt)', borderRadius: 10, padding: 3, border: '1px solid var(--line)' }}>
          <button onClick={() => setViewMode('calendar')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: viewMode === 'calendar' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'calendar' ? '#2563eb' : 'var(--muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: viewMode === 'calendar' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            <CalendarIcon size={15} /> Calendar View
          </button>
          <button onClick={() => setViewMode('table')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: viewMode === 'table' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'table' ? '#2563eb' : 'var(--muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: viewMode === 'table' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            <List size={15} /> Table View
          </button>
        </div>
      </div>

      <CheckInCard employees={employees} onRefresh={fetchAttendance} />

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Present / Late', value: presentCount, color: '#059669', bg: '#dcfce7' },
          { label: 'Absent', value: absentCount, color: '#dc2626', bg: '#fee2e2' },
          { label: 'On Leave', value: attendance.filter(a => a.status === 'LEAVE').length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Half Day', value: attendance.filter(a => a.status === 'HALF_DAY').length, color: '#c2410c', bg: '#fff7ed' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Admin Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {employees.length > 1 && (
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}>
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        {employees.length > 1 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}>
          <option value="">All Status</option>
          {['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none' }} />
        <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none' }} />

        {/* Quick Date Presets */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={() => { setDateFrom('2026-08-01'); setDateTo('2026-08-31'); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel-alt)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Aug 2026</button>
          <button onClick={() => { setDateFrom('2026-09-01'); setDateTo('2026-09-30'); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel-alt)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Sep 2026</button>
          <button onClick={() => { setDateFrom('2026-08-01'); setDateTo('2026-09-30'); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel-alt)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>All</button>
        </div>
      </div>

      {/* Main Content Area: Calendar or Table */}
      {viewMode === 'calendar' ? (
        <AttendanceCalendarView
          attendance={attendance}
          employees={employees}
          empFilter={empFilter}
          workSchedule={workSchedule}
          onSelectEdit={setEditAtt}
        />
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--panel-alt)', borderBottom: '1px solid var(--line)' }}>
                {['Employee', 'Date', 'Check In', 'Check Out', 'Duration', 'Status', 'Source', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No attendance records found for this filter</td></tr>
              ) : attendance.map((a, idx) => (
                <tr key={a.id} style={{ borderBottom: idx < attendance.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{a.employee?.name || a.employee_id.slice(0, 8)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--muted)' }}>{a.attendance_date}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{fmtTime(a.check_in_at)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{fmtTime(a.check_out_at)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--muted)' }}>{fmtMins(a.working_minutes)}</td>
                  <td style={{ padding: '11px 14px' }}><AttBadge status={a.status} /></td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: a.source === 'WEB' ? '#0891b2' : 'var(--muted)', background: a.source === 'WEB' ? '#e0f2fe' : 'var(--panel-alt)', padding: '2px 8px', borderRadius: 4 }}>{a.source}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => setEditAtt(a)} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel-alt)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={13} color="var(--muted)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editAtt && <EditAttModal att={editAtt} onClose={() => setEditAtt(null)} onSaved={fetchAttendance} />}
    </div>
  );
}
