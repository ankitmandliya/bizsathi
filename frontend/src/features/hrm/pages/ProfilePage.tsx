import React, { useEffect, useState } from 'react';
import { User, Phone, Landmark, AlertCircle, CheckCircle, Save, ShieldAlert, CreditCard, Lock, KeyRound } from 'lucide-react';
import { hrmApi, Employee } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

export function ProfilePage() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_account_number: '',
    bank_ifsc: '',
  });

  // Change Password state
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hrmApi.getMyProfile();
      setProfile(data);
      setForm({
        phone: data.phone || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        bank_account_number: data.bank_account_number || '',
        bank_ifsc: data.bank_ifsc || '',
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user profile. Make sure your account is linked to an employee record.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await hrmApi.updateMyProfile({
        phone: form.phone || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        bank_account_number: form.bank_account_number || undefined,
        bank_ifsc: form.bank_ifsc || undefined,
      });
      setProfile(updated);
      setSuccess('Profile details updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.current_password || !pwdForm.new_password) {
      setPwdError('Please enter current and new password.');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (pwdForm.new_password.length < 4) {
      setPwdError('New password must be at least 4 characters.');
      return;
    }

    setPwdSaving(true);
    setPwdError(null);
    setPwdSuccess(null);

    try {
      const res = await hrmApi.changePassword(pwdForm.current_password, pwdForm.new_password);
      setPwdSuccess(res.message || 'Password changed successfully!');
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPwdSuccess(null), 4000);
    } catch (err) {
      setPwdError(getErrorMessage(err, 'Failed to change password. Please verify your current password.'));
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading My Profile…</div>;
  }

  if (error && !profile) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <ShieldAlert size={36} color="#dc2626" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>Profile Access Notice</h2>
          <p style={{ fontSize: 14, color: '#7f1d1d', margin: 0 }}>
            {error || 'Unable to load profile.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', padding: 24, marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{profile?.name}</h1>
            <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>
              {profile?.designation?.name || 'Employee'} {profile?.department?.name ? ` • ${profile.department.name}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d' }}>
                Status: {profile?.status || 'Active'}
              </span>
              {profile?.employment_type && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: '#eff6ff', color: '#1d4ed8' }}>
                  {profile.employment_type}
                </span>
              )}
              {profile?.joining_date && (
                <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
                  Joined: {profile.joining_date}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
        {/* Personal & Emergency Contact */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Personal & Emergency Contact Details</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email Address (Read-only)</label>
              <input type="text" value={profile?.email || ''} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Emergency Contact Name</label>
              <input type="text" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} placeholder="Relative or Spouse Name" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Emergency Contact Phone</label>
              <input type="text" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Bank & Payment Details */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Bank Account Details</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Bank Account Number</label>
              <div style={{ position: 'relative' }}>
                <input type="text" name="bank_account_number" value={form.bank_account_number} onChange={handleChange} placeholder="e.g. 123456789012" style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                <CreditCard size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Bank IFSC Code</label>
              <input type="text" name="bank_ifsc" value={form.bank_ifsc} onChange={handleChange} placeholder="e.g. SBIN0001234" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Statutory Info (Read Only) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>Statutory Information (HR Managed)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>PF Number</label>
              <input type="text" value={profile?.pf_number || 'Not Assigned'} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>ESI Number</label>
              <input type="text" value={profile?.esi_number || 'Not Assigned'} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.35)', opacity: saving ? 0.7 : 1 }}>
            <Save size={16} />
            {saving ? 'Saving Changes…' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Security & Change Password Section */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Security & Change Password</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>Update your account password to maintain security</p>
          </div>
        </div>

        {pwdSuccess && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
            <CheckCircle size={18} />
            {pwdSuccess}
          </div>
        )}
        {pwdError && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <AlertCircle size={18} />
            {pwdError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Current Password *</label>
              <input
                type="password"
                value={pwdForm.current_password}
                onChange={e => setPwdForm(p => ({ ...p, current_password: e.target.value }))}
                placeholder="Current password"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>New Password *</label>
              <input
                type="password"
                value={pwdForm.new_password}
                onChange={e => setPwdForm(p => ({ ...p, new_password: e.target.value }))}
                placeholder="New password (min 4 chars)"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Confirm New Password *</label>
              <input
                type="password"
                value={pwdForm.confirm_password}
                onChange={e => setPwdForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Confirm new password"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="submit"
              disabled={pwdSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.3)', opacity: pwdSaving ? 0.7 : 1 }}
            >
              <KeyRound size={16} />
              {pwdSaving ? 'Updating Password…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
