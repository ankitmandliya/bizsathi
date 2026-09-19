import React, { useEffect, useState } from 'react';
import {
  Clock,
  Calendar,
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { hrmApi, Holiday, LeaveType } from '../hrm/services/hrmApi';
import { getErrorMessage } from '../../utils/error';

const WEEKDAYS = [
  { id: '0', label: 'Mon' },
  { id: '1', label: 'Tue' },
  { id: '2', label: 'Wed' },
  { id: '3', label: 'Thu' },
  { id: '4', label: 'Fri' },
  { id: '5', label: 'Sat' },
  { id: '6', label: 'Sun' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'holidays' | 'leave_types'>('schedule');

  // Work Schedule State
  const [workingDays, setWorkingDays] = useState<string[]>(['0', '1', '2', '3', '4']);
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:30');
  const [lateGrace, setLateGrace] = useState(15);
  const [halfDayThreshold, setHalfDayThreshold] = useState(4);
  const [payday, setPayday] = useState(1);

  // Holidays & Leave Types
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Modals & Messages
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeaveName, setNewLeaveName] = useState('');
  const [newLeavePaid, setNewLeavePaid] = useState(true);
  const [newLeaveDays, setNewLeaveDays] = useState(12);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setMessage(null);
      const [sched, hols, lTypes] = await Promise.all([
        hrmApi.getWorkSchedule(),
        hrmApi.getHolidays(new Date().getFullYear()),
        hrmApi.getLeaveTypes(),
      ]);

      if (sched) {
        setWorkingDays(sched.working_days ? sched.working_days.split(',') : ['0', '1', '2', '3', '4']);
        setStartTime(sched.start_time ? sched.start_time.slice(0, 5) : '09:30');
        setEndTime(sched.end_time ? sched.end_time.slice(0, 5) : '18:30');
        setLateGrace(sched.late_after_minutes ?? 15);
        setHalfDayThreshold(sched.half_day_threshold_hours ?? 4);
        setPayday(sched.payday ?? 1);
      }
      setHolidays(hols || []);
      setLeaveTypes(lTypes || []);
    } catch (err: unknown) {
      console.error('Failed to load settings', err);
      setMessage({
        text: getErrorMessage(err, 'Failed to load settings. Please ensure PostgreSQL database service is running.'),
        type: 'error',
      });
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    setMessage(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await hrmApi.setWorkSchedule({
        working_days: workingDays.join(','),
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        late_after_minutes: Number(lateGrace),
        half_day_threshold_hours: Number(halfDayThreshold),
        payday: Number(payday),
        effective_from: today,
      });
      setMessage({ text: 'Work Schedule & Payroll Cycle updated successfully!', type: 'success' });
    } catch (err: unknown) {
      setMessage({ text: getErrorMessage(err, 'Failed to update schedule'), type: 'error' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleDay = (dayId: string) => {
    setWorkingDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    try {
      const created = await hrmApi.createHoliday({ name: newHolidayName, holiday_date: newHolidayDate });
      setHolidays(prev => [...prev, created]);
      setShowHolidayModal(false);
      setNewHolidayName('');
      setNewHolidayDate('');
    } catch {
      alert('Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await hrmApi.deleteHoliday(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch {
      alert('Failed to delete holiday');
    }
  };

  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveName) return;
    try {
      const created = await hrmApi.createLeaveType({
        name: newLeaveName,
        is_paid: newLeavePaid,
        default_annual_days: Number(newLeaveDays),
      });
      setLeaveTypes(prev => [...prev, created]);
      setShowLeaveModal(false);
      setNewLeaveName('');
    } catch {
      alert('Failed to add leave type');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon size={18} color="#fff" />
          </div>
          Business Settings
        </h1>
        <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '14px' }}>
          Configure work schedule, official holidays, leave policies, and payroll cycle
        </p>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'schedule' ? '2.5px solid #4f46e5' : '2.5px solid transparent', color: activeTab === 'schedule' ? '#4f46e5' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Clock size={16} /> Work Schedule & Payroll Cycle
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'holidays' ? '2.5px solid #4f46e5' : '2.5px solid transparent', color: activeTab === 'holidays' ? '#4f46e5' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Calendar size={16} /> Official Holidays ({holidays.length})
        </button>
        <button
          onClick={() => setActiveTab('leave_types')}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'leave_types' ? '2.5px solid #4f46e5' : '2.5px solid transparent', color: activeTab === 'leave_types' ? '#4f46e5' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Layers size={16} /> Leave Policy ({leaveTypes.length})
        </button>
      </div>

      {/* Tab 1: Work Schedule */}
      {activeTab === 'schedule' && (
        <form onSubmit={handleSaveSchedule} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="#4f46e5" /> Business Hours & Payroll Rules
          </h2>

          {/* Working Days */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '10px' }}>
              WORKING DAYS OF THE WEEK
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {WEEKDAYS.map(d => {
                const isSelected = workingDays.includes(d.id);
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggleDay(d.id)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      border: isSelected ? '1.5px solid #4f46e5' : '1.5px solid var(--line)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                      color: isSelected ? '#4f46e5' : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                WORK START TIME
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                WORK END TIME
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Grace Period & Half day */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                LATE GRACE PERIOD (MINUTES)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={lateGrace}
                onChange={e => setLateGrace(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Check-in after start time + grace is marked LATE
              </span>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                HALF-DAY THRESHOLD (HOURS)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={halfDayThreshold}
                onChange={e => setHalfDayThreshold(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Working less than this is marked HALF_DAY
              </span>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                PAYROLL DAY OF MONTH
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={payday}
                onChange={e => setPayday(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Expected monthly salary disbursement day (e.g. 1st)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={savingSchedule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                opacity: savingSchedule ? 0.7 : 1,
              }}
            >
              <Save size={16} /> {savingSchedule ? 'Saving...' : 'Save Schedule Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Holidays */}
      {activeTab === 'holidays' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#4f46e5" /> Official Holidays ({new Date().getFullYear()})
            </h2>
            <button
              onClick={() => setShowHolidayModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: '13px', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} /> Add Holiday
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontSize: '12px' }}>
                <th style={{ padding: '12px' }}>HOLIDAY NAME</th>
                <th style={{ padding: '12px' }}>DATE</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    No official holidays configured for this year.
                  </td>
                </tr>
              ) : (
                holidays.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{h.name}</td>
                    <td style={{ padding: '12px', color: 'var(--muted)' }}>
                      {new Date(h.holiday_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Leave Types */}
      {activeTab === 'leave_types' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#4f46e5" /> Leave Categories & Allocation
            </h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: '13px', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} /> Add Leave Category
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontSize: '12px' }}>
                <th style={{ padding: '12px' }}>LEAVE TYPE</th>
                <th style={{ padding: '12px' }}>PAID / UNPAID</th>
                <th style={{ padding: '12px' }}>ANNUAL DAYS ALLOCATION</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map(lt => (
                <tr key={lt.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{lt.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: lt.is_paid ? '#f0fdf4' : '#fef2f2', color: lt.is_paid ? '#166534' : '#991b1b' }}>
                      {lt.is_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{lt.default_annual_days} days / year</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <form onSubmit={handleAddHoliday} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 450, margin: 'auto', border: '1px solid var(--line)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Add Official Holiday</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>HOLIDAY NAME</label>
              <input
                type="text"
                placeholder="e.g. Independence Day"
                value={newHolidayName}
                onChange={e => setNewHolidayName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>DATE</label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowHolidayModal(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--text)' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Add Holiday</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Leave Type Modal */}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <form onSubmit={handleAddLeaveType} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 450, margin: 'auto', border: '1px solid var(--line)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Add Leave Category</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>LEAVE NAME</label>
              <input
                type="text"
                placeholder="e.g. Festival Leave"
                value={newLeaveName}
                onChange={e => setNewLeaveName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
                required
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>LEAVE TYPE</label>
              <select
                value={newLeavePaid ? 'paid' : 'unpaid'}
                onChange={e => setNewLeavePaid(e.target.value === 'paid')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
              >
                <option value="paid">Paid Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>ANNUAL DAYS ALLOCATION</label>
              <input
                type="number"
                min="0"
                max="365"
                value={newLeaveDays}
                onChange={e => setNewLeaveDays(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowLeaveModal(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--text)' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Add Category</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
