import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock, Calendar, FileText, Download,
  Plus, LogIn, LogOut, X, ShieldAlert
} from 'lucide-react';
import {
  hrmApi, EmployeeDashboardData, LeaveType, Payslip
} from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

function formatPeriod(periodStr?: string) {
  if (!periodStr) return '—';
  const parts = periodStr.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (!isNaN(year) && !isNaN(month)) {
      const date = new Date(year, month, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  return periodStr;
}

export function EmployeeDashboardPage() {
  const [data, setData] = useState<EmployeeDashboardData | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check-in / out state
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showRemarksInput, setShowRemarksInput] = useState(false);

  // Apply leave modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dash, pays, lTypes] = await Promise.all([
        hrmApi.getMyDashboard(),
        hrmApi.getMyPayslips(),
        hrmApi.getLeaveTypes(),
      ]);
      setData(dash);
      setPayslips(pays);
      setLeaveTypes(lTypes);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load employee dashboard. Ensure your account is linked to an active Employee record.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await hrmApi.checkIn(undefined, remarks || undefined);
      setRemarks('');
      setShowRemarksInput(false);
      await fetchDashboard();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Check-in failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!data?.today_attendance) return;
    setActionLoading(true);
    try {
      await hrmApi.checkOut(data.today_attendance.id, remarks || undefined);
      setRemarks('');
      setShowRemarksInput(false);
      await fetchDashboard();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Check-out failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate) {
      setLeaveError('Please select leave type, start date, and end date.');
      return;
    }
    setLeaveSubmitting(true); setLeaveError(null);
    try {
      await hrmApi.createLeaveRequest({
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      });
      setShowLeaveModal(false);
      setLeaveTypeId(''); setStartDate(''); setEndDate(''); setReason('');
      await fetchDashboard();
    } catch (err: unknown) {
      setLeaveError(getErrorMessage(err, 'Failed to submit leave request.'));
    } finally {
      setLeaveSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading Employee Dashboard…</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <ShieldAlert size={36} color="#dc2626" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>Dashboard Access Notice</h2>
          <p style={{ fontSize: 14, color: '#7f1d1d', margin: 0 }}>
            {error || 'Unable to load employee profile.'}
          </p>
        </div>
      </div>
    );
  }

  const { employee, today_attendance, month_summary, leave_balances, pending_leaves } = data;
  const isCheckedIn = !!today_attendance?.check_in_at;
  const isCheckedOut = !!today_attendance?.check_out_at;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header Profile Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
              {employee.name.charAt(0)}
            </div>
            Welcome back, {employee.name}!
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>
            {employee.department?.name ? `${employee.department.name} • ` : ''}
            {employee.designation?.name || 'Employee Self-Service Dashboard'}
          </p>
        </div>

        <button
          onClick={() => setShowLeaveModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
        >
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Today's Attendance Card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Today's Attendance</h3>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: isCheckedOut ? '#f1f5f9' : isCheckedIn ? '#dcfce7' : '#fef3c7', color: isCheckedOut ? '#475569' : isCheckedIn ? '#166534' : '#b45309' }}>
                {isCheckedOut ? 'COMPLETED' : isCheckedIn ? (today_attendance?.status || 'PRESENT') : 'NOT CHECKED IN'}
              </span>
            </div>

            <div style={{ background: 'var(--panel-alt)', borderRadius: 10, padding: '16px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Check In Time</p>
                <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {today_attendance?.check_in_at ? new Date(today_attendance.check_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Check Out Time</p>
                <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {today_attendance?.check_out_at ? new Date(today_attendance.check_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
            </div>

            {showRemarksInput && (
              <input
                type="text"
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!isCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: actionLoading ? 0.7 : 1 }}
              >
                <LogIn size={16} /> Check In Now
              </button>
            ) : !isCheckedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: actionLoading ? 0.7 : 1 }}
              >
                <LogOut size={16} /> Check Out Now
              </button>
            ) : (
              <div style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#059669', background: '#f0fdf4', borderRadius: 8 }}>
                ✓ Today's work shift logged successfully
              </div>
            )}
          </div>
        </div>

        {/* This Month's Summary Counters */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={20} color="#4f46e5" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>This Month Summary</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Present', val: month_summary.present, color: '#059669', bg: '#f0fdf4' },
              { label: 'Late', val: month_summary.late, color: '#d97706', bg: '#fffbeb' },
              { label: 'Half Day', val: month_summary.half_day, color: '#0284c7', bg: '#f0f9ff' },
              { label: 'Absent', val: month_summary.absent, color: '#dc2626', bg: '#fef2f2' },
              { label: 'Leave', val: month_summary.leave, color: '#7c3aed', bg: '#f5f3ff' },
            ].map((stat, i) => (
              <div key={i} style={{ background: stat.bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center', border: `1px solid ${stat.color}20` }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.val}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave Balances & Pending Leave Requests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Leave Balances */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Annual Leave Balances</h3>
          {leave_balances.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>No leave balance data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leave_balances.map(lb => (
                <div key={lb.leave_type_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'var(--panel-alt)', border: '1px solid var(--line)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{lb.leave_type_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                      Used {lb.used_days} of {lb.default_annual_days} days
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: lb.remaining_days > 0 ? '#059669' : '#dc2626' }}>
                      {lb.remaining_days}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>Left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending & Recent Leave Requests */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Pending Leave Applications</h3>
          {pending_leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
              No pending leave requests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending_leaves.map(req => (
                <div key={req.id} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--panel-alt)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{req.leave_type?.name || 'Leave'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      {req.start_date} to {req.end_date}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#fef3c7', color: '#b45309' }}>
                    PENDING
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payslip History Section */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#4f46e5" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>My Payslip History</h3>
          </div>
        </div>

        {payslips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
            No processed payslips found for your account yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--panel-alt)', borderBottom: '1px solid var(--line)' }}>
                {['Payroll Period', 'Issue Date', 'Gross Salary', 'Deductions', 'Net Payable', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.map(ps => {
                const totalDeductions = ps.unpaid_absence_deduction + ps.salary_advance_deduction + ps.other_deductions;
                const periodDisplay = formatPeriod(ps.payroll_period);
                return (
                  <tr key={ps.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>
                      {periodDisplay}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
                      {new Date(ps.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>₹{ps.gross_salary.toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#dc2626' }}>-₹{totalDeductions.toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: ps.net_payable >= 0 ? '#059669' : '#dc2626' }}>
                      ₹{ps.net_payable.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <a
                        href={hrmApi.getPayslipPdfUrl(ps.id)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}
                      >
                        <Download size={14} /> Download PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleApplyLeave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {leaveError && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{leaveError}</div>}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Leave Type *</label>
                <select value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', background: 'var(--bg-card)' }}>
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.is_paid ? 'Paid' : 'Unpaid'})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Start Date *</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>End Date *</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Reason (Optional)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Provide reason for leave request…" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={leaveSubmitting} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: leaveSubmitting ? 0.7 : 1 }}>
                  {leaveSubmitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
