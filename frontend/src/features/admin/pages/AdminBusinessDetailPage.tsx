import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, AlertOctagon, Clock, User, Mail, Shield, Send, AlertTriangle, Copy, Check, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { adminApi, type BusinessDetail } from '../../../services/api/adminApi';

export function AdminBusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [biz, setBiz] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Super Admin Exclusive - Copy Link & Manual Verification State
  const [gettingLink, setGettingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [setupLinkUrl, setSetupLinkUrl] = useState<string | null>(null);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminApi.getBusinessDetail(id)
      .then(res => {
        setBiz(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load business detail:', err);
        setError('Business not found or failed to load.');
        setLoading(false);
      });
  }, [id]);

  const handleResendInvitation = async () => {
    if (!biz || !id) return;
    setResending(true);
    setResendFeedback(null);
    try {
      const updated = await adminApi.resendInvitation(id);
      setBiz(updated);
      setResendFeedback({ type: 'success', message: 'Setup invitation email resent successfully!' });
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to resend setup invitation email.';
      setResendFeedback({ type: 'error', message: detail });
    } finally {
      setResending(false);
    }
  };

  const handleCopySetupLink = async () => {
    if (!id) return;
    setGettingLink(true);
    setResendFeedback(null);
    try {
      const res = await adminApi.getSetupLink(id);
      const link = res.setup_url || (res as any).setup_link;
      setSetupLinkUrl(link);
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setResendFeedback({ type: 'success', message: 'Account setup link copied to clipboard!' });
      setTimeout(() => setCopiedLink(false), 4000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to retrieve setup link.';
      setResendFeedback({ type: 'error', message: detail });
    } finally {
      setGettingLink(false);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVerifyPassword(pwd);
  };

  const handleManualVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !verifyPassword) return;
    if (verifyPassword.length < 8) {
      setVerifyError('Password must be at least 8 characters long.');
      return;
    }
    setVerifySubmitting(true);
    setVerifyError(null);
    try {
      await adminApi.manualVerifySetup(id, verifyPassword);
      setVerifyModalOpen(false);
      setVerifyPassword('');
      setResendFeedback({ type: 'success', message: 'Business owner setup manually verified and account activated!' });
      // Refresh business details
      const updated = await adminApi.getBusinessDetail(id);
      setBiz(updated);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to manually verify setup.';
      setVerifyError(detail);
    } finally {
      setVerifySubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading business detail…</div>;
  }

  if (error || !biz) {
    return (
      <div style={{ padding: '24px' }}>
        <button
          onClick={() => navigate('/admin/businesses')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} /> Back to Businesses
        </button>
        <div className="alert alert-error">{error || 'Business not found'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Back Nav */}
      <div>
        <button
          onClick={() => navigate('/admin/businesses')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to Businesses List
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={24} color="#6366f1" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                {biz.name}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '2px 0 0 0' }}>
                ID: {biz.id} · Slug: {biz.slug}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {biz.status === 'Suspended' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                <AlertOctagon size={16} /> Suspended
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Active
              </span>
            )}
          </div>
        </div>
      </div>

      {resendFeedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            background: resendFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: resendFeedback.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${resendFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {resendFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{resendFeedback.message}</span>
        </div>
      )}

      {/* Main Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Business Overview Card */}
        <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            Business Metadata
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Onboarding Path</span>
              <strong style={{ color: 'var(--text)' }}>
                {biz.created_via === 'SUPER_ADMIN' ? 'Super-Admin Provisioned' : 'Self-Service Signup'}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Created Date</span>
              <strong style={{ color: 'var(--text)' }}>
                {new Date(biz.created_at).toLocaleString()}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Active Member Count</span>
              <strong style={{ color: 'var(--text)' }}>{biz.member_count} users</strong>
            </div>

            {biz.status === 'Suspended' && biz.suspended_reason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Suspension Reason:</strong>
                {biz.suspended_reason}
                {biz.suspended_at && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
                    Suspended on: {new Date(biz.suspended_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Account Setup & Invitation Status Card */}
        <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Account Setup & Email Status
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px', marginBottom: '4px' }}>Account Setup Status</span>
              {biz.setup_pending ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700 }}>
                  <Clock size={14} /> ⏳ Setup Pending Owner Password
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> ✓ Setup Completed
                </span>
              )}
            </div>

            <div>
              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px', marginBottom: '4px' }}>Invitation Email Status</span>
              {biz.invitation_email_status === 'SENT' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> ✓ Invitation Delivered (SMTP)
                </span>
              ) : biz.invitation_email_status === 'FAILED' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700 }}>
                  <AlertTriangle size={14} /> ⚠ Email Delivery Failed
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700 }}>
                  ⏳ Pending
                </span>
              )}
            </div>

            {biz.last_invitation_sent_at && (
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Last Invitation Sent</span>
                <strong style={{ color: 'var(--text)' }}>
                  {new Date(biz.last_invitation_sent_at).toLocaleString()}
                </strong>
              </div>
            )}

            {/* Super Admin Controls Panel for Pending Setup Owners */}
            {biz.setup_pending && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-color, #334155)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} color="#818cf8" />
                  <span>Super Admin Verification Controls</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {/* Resend Email */}
                  <button
                    type="button"
                    onClick={handleResendInvitation}
                    disabled={resending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: resending ? 'wait' : 'pointer',
                    }}
                  >
                    <Send size={13} />
                    <span>{resending ? 'Sending…' : 'Resend Email'}</span>
                  </button>

                  {/* Copy Setup Link */}
                  <button
                    type="button"
                    onClick={handleCopySetupLink}
                    disabled={gettingLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: copiedLink ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: copiedLink ? '#10b981' : '#38bdf8',
                      border: `1px solid ${copiedLink ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: gettingLink ? 'wait' : 'pointer',
                    }}
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLink ? 'Link Copied!' : gettingLink ? 'Getting Link…' : 'Copy Setup Link'}</span>
                  </button>

                  {/* Verify & Complete Setup */}
                  <button
                    type="button"
                    onClick={() => { setVerifyModalOpen(true); setVerifyError(null); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>Verify & Complete Setup</span>
                  </button>
                </div>

                {setupLinkUrl && (
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Direct Setup URL:</span>
                    <input
                      type="text"
                      readOnly
                      value={setupLinkUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: 'var(--input-bg, #0f172a)',
                        border: '1px solid var(--border-color, #334155)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#38bdf8',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Owner Profile Card */}
        <div style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            Primary Owner Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Full Name</span>
                <strong style={{ color: 'var(--text)' }}>{biz.owner.full_name || 'Not Available'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={18} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Email Address</span>
                <strong style={{ color: 'var(--text)' }}>{biz.owner.email || 'Not Available'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={18} color="var(--muted)" />
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12px' }}>Account Status</span>
                <strong style={{ color: biz.owner.is_active ? '#10b981' : '#ef4444' }}>
                  {biz.owner.is_active ? 'Active User' : 'Inactive User'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin - Verify & Complete Setup Modal */}
      {verifyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg, #1e293b)', width: '100%', maxWidth: '480px', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} /> Verify & Complete Setup
              </h3>
              <button type="button" onClick={() => setVerifyModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted, #94a3b8)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', marginBottom: '16px', lineHeight: '1.5' }}>
              Manually set the password for owner <strong>{biz.owner.full_name || biz.owner.email}</strong>. This will activate the business account immediately without requiring email confirmation.
            </p>

            {verifyError && (
              <div className="alert alert-error" style={{ marginBottom: '16px', fontSize: '13px' }}>
                {verifyError}
              </div>
            )}

            <form onSubmit={handleManualVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted, #94a3b8)' }}>Set Owner Password</label>
                  <button
                    type="button"
                    onClick={generateTempPassword}
                    style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Auto-Generate
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={verifyPassword}
                    onChange={(e) => setVerifyPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 36px 8px 12px', background: 'var(--input-bg, #0f172a)', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted, #94a3b8)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setVerifyModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', color: 'var(--text, #f8fafc)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={verifySubmitting || !verifyPassword} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: verifySubmitting ? 'wait' : 'pointer' }}>
                  {verifySubmitting ? 'Verifying…' : 'Verify & Activate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
