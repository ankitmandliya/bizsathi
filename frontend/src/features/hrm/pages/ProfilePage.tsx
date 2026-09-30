import React, { useEffect, useState } from 'react';
import {
  User,
  Phone,
  Landmark,
  AlertCircle,
  CheckCircle,
  Save,
  ShieldAlert,
  CreditCard,
  Lock,
  KeyRound,
  Mail,
  Building2,
  Calendar,
  Briefcase,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { hrmApi, Employee } from '../services/hrmApi';
import { getErrorMessage } from '../../../utils/error';

export function ProfilePage() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'contact' | 'bank' | 'statutory' | 'security'>('contact');

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
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)', fontSize: '14px', fontWeight: 600 }}>
        Loading My Profile Details…
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={{ padding: 32, maxWidth: 700, margin: '40px auto' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <ShieldAlert size={40} color="#dc2626" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', margin: '0 0 8px' }}>Profile Access Notice</h2>
          <p style={{ fontSize: 14, color: '#7f1d1d', margin: 0, lineHeight: 1.6 }}>
            {error || 'Unable to load profile.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          My Account & Profile
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
          Manage your contact information, bank details, and security credentials
        </p>
      </div>

      {/* Global Status Notifications */}
      {success && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          color: '#166534',
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <CheckCircle size={20} color="#166534" />
          {success}
        </div>
      )}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <AlertCircle size={20} color="#dc2626" />
          {error}
        </div>
      )}

      {/* 2-Column Pro SaaS Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Profile Card & Quick Navigation Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Main User Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
            {/* Header Gradient Cover */}
            <div style={{
              height: 84,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
              position: 'relative'
            }} />

            {/* Profile Avatar & Details */}
            <div style={{ padding: '0 20px 20px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36, marginBottom: 14 }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 800,
                  border: '4px solid var(--bg-card)',
                  boxShadow: '0 6px 16px rgba(79,70,229,0.3)',
                  position: 'relative',
                }}>
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  <span style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid var(--bg-card)'
                  }} title="Active" />
                </div>

                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {profile?.status || 'Active'}
                </span>
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {profile?.name}
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '3px 0 12px', fontWeight: 500 }}>
                {profile?.designation?.name || 'Employee'} {profile?.department?.name ? ` • ${profile.department.name}` : ''}
              </p>

              {/* Quick Info Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 12.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}>
                  <Mail size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {profile?.email || 'No email provided'}
                  </span>
                </div>

                {profile?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}>
                    <Phone size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{profile.phone}</span>
                  </div>
                )}

                {profile?.joining_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}>
                    <Calendar size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span>Joined: {profile.joining_date}</span>
                  </div>
                )}

                {profile?.employment_type && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}>
                    <Briefcase size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span>{profile.employment_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Segmented Nav Tabs */}
          <div className="card" style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { id: 'contact', label: 'Personal & Contact', icon: User, color: '#6366f1' },
              { id: 'bank', label: 'Bank Account Details', icon: Landmark, color: '#10b981' },
              { id: 'statutory', label: 'Statutory (HR Info)', icon: Lock, color: '#f59e0b' },
              { id: 'security', label: 'Security & Password', icon: KeyRound, color: '#ef4444' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: isActive ? 'var(--primary-dim)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text)',
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={16} style={{ color: isActive ? 'var(--primary)' : tab.color }} />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && <Check size={15} style={{ color: 'var(--primary)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Tab Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* TAB 1: Personal & Contact */}
          {(activeTab === 'contact' || activeTab === 'bank' || activeTab === 'statutory') && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Personal Contact */}
              <div className="card" style={{ padding: 24, boxShadow: 'var(--shadow-sm)', borderRadius: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--line)'
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                      Personal & Emergency Contact
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Keep your active contact numbers and emergency reachability updated
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Email Address (Read-only)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={profile?.email || ''}
                        disabled
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: 10,
                          border: '1px solid var(--line)',
                          background: 'var(--panel-alt)',
                          color: 'var(--muted)',
                          fontSize: 13.5,
                          fontWeight: 600,
                          boxSizing: 'border-box'
                        }}
                      />
                      <Lock size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--muted)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+91 9876543210"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: 10,
                          border: '1.5px solid var(--line)',
                          background: 'var(--bg-card)',
                          color: 'var(--text)',
                          fontSize: 13.5,
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Phone size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--primary)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={form.emergency_contact_name}
                      onChange={handleChange}
                      placeholder="Spouse / Parent Name"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        fontSize: 13.5,
                        fontWeight: 500,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Emergency Contact Phone
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="emergency_contact_phone"
                        value={form.emergency_contact_phone}
                        onChange={handleChange}
                        placeholder="+91 9876543210"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: 10,
                          border: '1.5px solid var(--line)',
                          background: 'var(--bg-card)',
                          color: 'var(--text)',
                          fontSize: 13.5,
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Phone size={15} style={{ position: 'absolute', left: 14, top: 13, color: '#ef4444' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="card" style={{ padding: 24, boxShadow: 'var(--shadow-sm)', borderRadius: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--line)'
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                      Bank Account Details
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Salary payout account for direct bank credit
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Bank Account Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="bank_account_number"
                        value={form.bank_account_number}
                        onChange={handleChange}
                        placeholder="e.g. 123456789012"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: 10,
                          border: '1.5px solid var(--line)',
                          background: 'var(--bg-card)',
                          color: 'var(--text)',
                          fontSize: 13.5,
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <CreditCard size={15} style={{ position: 'absolute', left: 14, top: 13, color: '#10b981' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      name="bank_ifsc"
                      value={form.bank_ifsc}
                      onChange={handleChange}
                      placeholder="e.g. SBIN0001234"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        fontSize: 13.5,
                        fontWeight: 500,
                        outline: 'none',
                        boxSizing: 'border-box',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Statutory Information */}
              <div className="card" style={{ padding: 24, boxShadow: 'var(--shadow-sm)', borderRadius: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--line)'
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                      Statutory Information (HR Managed)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Provident Fund (PF) and ESI details configured by HR administration
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      PF Number
                    </label>
                    <input
                      type="text"
                      value={profile?.pf_number || 'Not Assigned'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                        background: 'var(--panel-alt)',
                        color: 'var(--muted)',
                        fontSize: 13.5,
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ESI Number
                    </label>
                    <input
                      type="text"
                      value={profile?.esi_number || 'Not Assigned'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                        background: 'var(--panel-alt)',
                        color: 'var(--muted)',
                        fontSize: 13.5,
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 28px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                    opacity: saving ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Save size={17} />
                  {saving ? 'Saving Changes…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="card" style={{ padding: 24, boxShadow: 'var(--shadow-sm)', borderRadius: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: '1px solid var(--line)'
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                    Security & Change Password
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                    Update your account password to maintain security
                  </p>
                </div>
              </div>

              {pwdSuccess && (
                <div style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  color: '#166534',
                  padding: '12px 16px',
                  borderRadius: 10,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  <CheckCircle size={18} />
                  {pwdSuccess}
                </div>
              )}
              {pwdError && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '12px 16px',
                  borderRadius: 10,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  <AlertCircle size={18} />
                  {pwdError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={pwdForm.current_password}
                    onChange={e => setPwdForm(p => ({ ...p, current_password: e.target.value }))}
                    placeholder="Current password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--line)',
                      background: 'var(--bg-card)',
                      color: 'var(--text)',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={pwdForm.new_password}
                      onChange={e => setPwdForm(p => ({ ...p, new_password: e.target.value }))}
                      placeholder="New password (min 4 chars)"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={pwdForm.confirm_password}
                      onChange={e => setPwdForm(p => ({ ...p, confirm_password: e.target.value }))}
                      placeholder="Confirm new password"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--line)',
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={pwdSaving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 24px',
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                      opacity: pwdSaving ? 0.7 : 1
                    }}
                  >
                    <KeyRound size={16} />
                    {pwdSaving ? 'Updating Password…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
