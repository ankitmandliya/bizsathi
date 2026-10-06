import { useState, useEffect } from 'react';
import { Settings, Shield, Server, Zap, CheckCircle2, Lock, Mail, Send, AlertTriangle } from 'lucide-react';
import { adminApi, type PlatformSettings, type EmailSettings } from '../../../services/api/adminApi';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test Email Modal State
  const [testEmailModal, setTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((res) => {
        setSettings(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load platform settings:', err);
        setLoading(false);
      });
  }, []);

  const handleTogglePublicSignup = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateSettings({
        public_signup_enabled: !settings.public_signup_enabled,
      });
      setSettings(updated);
    } catch {
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await adminApi.sendTestEmail(testEmail.trim());
      setTestFeedback({ type: 'success', message: res.message || 'Test email sent successfully!' });
      // Refresh settings to update last test status
      const updatedSettings = await adminApi.getSettings();
      setSettings(updatedSettings);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to send test email. Check SMTP settings.';
      setTestFeedback({ type: 'error', message: detail });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
        <Settings size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading platform settings…</div>
      </div>
    );
  }

  const emailCfg: EmailSettings | undefined = settings?.email_settings;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', color: '#818cf8' }}>
              <Settings size={22} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Platform & System Settings
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Core platform runtime parameters, email/SMTP governance, public signup rules, and system controls
          </p>
        </div>
      </div>

      {/* Email / SMTP Configuration Card */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #334155)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color, #334155)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '8px', borderRadius: '8px', color: '#38bdf8', display: 'flex' }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Email / SMTP Configuration Status
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '2px 0 0 0' }}>
                Environment-based outbound SMTP gateway for business setup invitations and system notifications
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {emailCfg?.connection_status === 'connected' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                <CheckCircle2 size={16} /> SMTP Connected
              </span>
            ) : emailCfg?.configured ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                <AlertTriangle size={16} /> Connection Failed
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                Not Configured
              </span>
            )}

            <button
              onClick={() => {
                setTestEmailModal(true);
                setTestFeedback(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Send size={15} />
              <span>Send Test Email</span>
            </button>
          </div>
        </div>

        {/* Safe Config Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'var(--bg, #0f172a)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Provider</span>
            <div style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{emailCfg?.provider || 'SMTP'}</div>
          </div>

          <div style={{ background: 'var(--bg, #0f172a)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>SMTP Host</span>
            <div style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{emailCfg?.host || 'Not Configured'}</div>
          </div>

          <div style={{ background: 'var(--bg, #0f172a)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>SMTP Port & Security</span>
            <div style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
              Port {emailCfg?.port || 587} · {emailCfg?.security || 'STARTTLS'}
            </div>
          </div>

          <div style={{ background: 'var(--bg, #0f172a)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>SMTP Username</span>
            <div style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{emailCfg?.username || 'None'}</div>
          </div>

          <div style={{ background: 'var(--bg, #0f172a)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>SMTP Password</span>
            <div style={{ color: '#34d399', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
              {emailCfg?.configured ? '•••••••••• (Configured)' : 'Not Set'}
            </div>
          </div>

          <div style={{ background: 'var(--bg, #0f172a)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>From Email & Name</span>
            <div style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
              {emailCfg?.from_name} &lt;{emailCfg?.from_email}&gt;
            </div>
          </div>
        </div>

        {/* Last Test Diagnostic Info */}
        {emailCfg?.last_test_at && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '6px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span><strong>Last Diagnostic Test:</strong> {new Date(emailCfg.last_test_at).toLocaleString()}</span>
            <span><strong>Status:</strong> <span style={{ color: emailCfg.last_test_status === 'PASS' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{emailCfg.last_test_status}</span></span>
            <span><strong>Recipient:</strong> {emailCfg.last_test_recipient}</span>
          </div>
        )}
      </div>

      {/* Main Settings Card */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #334155)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Toggle Public Signup */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color, #334155)',
            paddingBottom: '20px',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#818cf8" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Public Self-Service Business Signup
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '6px 0 0 0', maxWidth: '600px' }}>
              Allow new business owners to self-register via the public pricing and checkout portal. Disabling blocks new public registrations without affecting existing active tenants.
            </p>
          </div>

          <button
            onClick={handleTogglePublicSignup}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: settings?.public_signup_enabled
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#475569',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '24px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: settings?.public_signup_enabled
                ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{settings?.public_signup_enabled ? 'Public Signup Enabled' : 'Public Signup Disabled'}</span>
          </button>
        </div>

        {/* System Environment Details Cards */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            System Environment & Security Rules
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg, #0f172a)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Server size={16} color="#818cf8" />
                <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}>Application Environment</span>
              </div>
              <strong style={{ color: 'var(--text)', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {settings?.app_env}
              </strong>
            </div>

            <div style={{ background: 'var(--bg, #0f172a)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Zap size={16} color="#fbbf24" />
                <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}>Default API Rate Limit</span>
              </div>
              <strong style={{ color: 'var(--text)', fontSize: '18px' }}>
                {settings?.default_rate_limit} req / hr / IP
              </strong>
            </div>

            <div style={{ background: 'var(--bg, #0f172a)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Lock size={16} color="#34d399" />
                <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}>Cross-Tenant Security</span>
              </div>
              <strong style={{ color: '#34d399', fontSize: '16px' }}>
                Enforced (RLS Active)
              </strong>
            </div>
          </div>
        </div>

        {/* Phase 2 Architecture Notice */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '13px',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Shield size={18} color="#818cf8" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#818cf8' }}>Super Admin Governance Note:</strong>
            <div style={{ marginTop: '4px', color: 'var(--muted)' }}>
              All configuration changes made in this panel are recorded instantly in the Platform Audit Logs with full timestamp and administrator identity tracing.
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Modal */}
      {testEmailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #1e293b)',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #334155)',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '8px', color: '#818cf8' }}>
                <Send size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Send Diagnostic Test Email
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
              Specify a recipient email address to verify outbound SMTP configuration and network connectivity.
            </p>

            <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg, #0f172a)',
                    border: '1px solid var(--border-color, #334155)',
                    color: 'var(--text)',
                    fontSize: '14px',
                  }}
                />
              </div>

              {testFeedback && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: testFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: testFeedback.type === 'success' ? '#10b981' : '#ef4444',
                    border: `1px solid ${testFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {testFeedback.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTestEmailModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: '#475569',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={sendingTest || !testEmail.trim()}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: sendingTest ? 'wait' : 'pointer',
                  }}
                >
                  {sendingTest ? 'Sending…' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
