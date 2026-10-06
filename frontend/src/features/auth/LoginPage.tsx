import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from './useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import apiClient from '../../services/api/client';
import { ProjectShowcase } from './ProjectShowcase';
import { hrmApi } from '../hrm/services/hrmApi';

import { setAuthTokens } from '../../services/auth/tokens';
import type { UserSession } from './AuthContextValue';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const response = await apiClient.post('/api/v1/auth/login', data);
      const { access_token, refresh_token } = response.data;

      // Store tokens first so auth header is attached to subsequent API calls
      setAuthTokens(access_token, refresh_token);

      // Fetch verified user profile from backend FIRST
      let meData: UserSession | null = null;
      try {
        const meRes = await apiClient.get('/api/v1/auth/me');
        if (meRes.data) {
          meData = {
            id: meRes.data.id,
            email: meRes.data.email,
            full_name: meRes.data.full_name,
            is_platform_admin: !!meRes.data.is_platform_admin,
            is_owner: !!meRes.data.is_owner,
            tenant_id: meRes.data.tenant_id,
            tenant_name: meRes.data.tenant_name,
            roles: meRes.data.roles || [],
            permissions: meRes.data.permissions || [],
          };
          if (meRes.data.tenant_name) {
            localStorage.setItem('bizsathi.business_name', meRes.data.tenant_name);
            window.dispatchEvent(new Event('business_name_updated'));
          }
        }
      } catch (meErr) {
        console.error('Failed to fetch user profile:', meErr);
      }

      const finalUser: UserSession = meData || {
        id: 'user-id',
        email: data.email,
        full_name: data.email,
        is_platform_admin: false,
        is_owner: true,
      };

      // Set user session in AuthContext
      login(access_token, refresh_token, finalUser);

      // Route platform admin to super admin console
      if (finalUser.is_platform_admin) {
        navigate('/admin/dashboard');
        return;
      }

      // Route Business Owners / Business Admins to Business Dashboard
      if (finalUser.is_owner || finalUser.roles?.includes('owner') || finalUser.roles?.includes('admin')) {
        navigate('/dashboard');
        return;
      }

      // Plain Employees route to Employee Self-Service Dashboard
      try {
        const emps = await hrmApi.getEmployees({ limit: 2 });
        if (emps && emps.total === 1 && emps.items[0]?.email?.toLowerCase() === data.email.toLowerCase()) {
          navigate('/hrm/dashboard');
          return;
        }
      } catch { /* proceed to main business dashboard */ }

      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response?: { data?: { detail?: string } } };
        setServerError(apiError.response?.data?.detail || 'Failed to sign in. Please try again.');
      } else {
        setServerError('Failed to sign in. Please check your credentials and try again.');
      }
    }
  };

  const fillDemoCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse 80% 80% at 50% -10%, #0f172a 0%, #020617 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Motion Background Graphics */}
      <style>{`
        @keyframes floatSphere1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.1); }
        }
        @keyframes floatSphere2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.15); }
        }
        @keyframes shimmerBtn {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .login-btn-gradient {
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.5), 0 0 20px rgba(56, 189, 248, 0.3);
        }
        .demo-chip {
          transition: all 0.2s ease;
        }
        .demo-chip:hover {
          background: rgba(56, 189, 248, 0.15) !important;
          border-color: rgba(56, 189, 248, 0.4) !important;
          color: #38bdf8 !important;
        }
      `}</style>

      {/* Floating Animated Ambient Glowing Spheres */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(37, 99, 235, 0.04) 70%, transparent 100%)',
          filter: 'blur(60px)',
          animation: 'floatSphere1 14s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.04) 70%, transparent 100%)',
          filter: 'blur(70px)',
          animation: 'floatSphere2 16s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '40px',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '1240px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left Column: Glassmorphic Login Form Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '40px 36px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            maxWidth: '460px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* Logo & Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', display: 'block' }}>
                    BizSathi
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', letterSpacing: '0.05em' }}>
                    BUSINESS OPERATING SYSTEM
                  </span>
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={12} /> Enterprise
              </span>
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              Enter your credentials to access your business console.
            </p>
          </div>

          {serverError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#fca5a5',
              }}
            >
              {serverError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@example.com"
              icon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock size={16} />}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              {...register('password')}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  defaultChecked
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    accentColor: '#2563eb',
                    cursor: 'pointer',
                  }}
                />
                Remember me
              </label>

              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password reset link has been sent if configured.');
                }}
                style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full login-btn-gradient"
              loading={isSubmitting}
              style={{
                height: '46px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                marginTop: '6px',
              }}
            >
              {isSubmitting ? 'Authenticating…' : (
                <>
                  Sign in to Workspace <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Quick Demo Fill Credentials
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fillDemoCredentials('superadmin@bizsathi.com', 'Test123$$')}
                className="demo-chip"
                title="superadmin@bizsathi.com / Test123$$"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={12} style={{ color: '#38bdf8' }} /> Super Admin (superadmin@bizsathi.com)
              </button>

              <button
                type="button"
                onClick={() => fillDemoCredentials('owner@acme.com', 'Test123$$')}
                className="demo-chip"
                title="owner@acme.com / Test123$$"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={12} style={{ color: '#34d399' }} /> Tenant Owner (owner@acme.com)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Project Showcase Graphics & Motion Design */}
        <div style={{ width: '100%' }}>
          <ProjectShowcase />
        </div>
      </div>
    </div>
  );
}
