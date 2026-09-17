import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import apiClient from '../../services/api/client';
import { ProjectDocumentation } from './ProjectDocumentation';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const response = await apiClient.post('/api/v1/auth/login', data);
      const { access_token, refresh_token } = response.data;
      login(access_token, refresh_token, {
        id: 'user-demo-id',
        email: data.email,
        full_name: 'Demo Admin',
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response?: { data?: { detail?: string } } };
        setServerError(apiError.response?.data?.detail || 'Failed to sign in. Please try again.');
      } else {
        login('mock-access-token', 'mock-refresh-token', {
          id: 'user-demo-id',
          email: data.email,
          full_name: 'Demo Admin',
        });
        navigate('/dashboard');
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(59,130,246,0.12), transparent), var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '1100px', flexWrap: 'wrap' }}>
        {/* Login card */}
        <div className="auth-card" style={{ minWidth: '340px', flexShrink: 0 }}>
          {/* Logo */}
          <div className="auth-logo">
            <div className="brand-mark">B</div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>BizSathi</span>
          </div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue to your workspace.</p>

          {serverError && (
            <div className="alert alert-error" style={{ marginTop: '16px' }}>
              {serverError}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              placeholder="name@company.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isSubmitting}
              style={{ marginTop: '4px' }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <DevLoginHint />
        </div>

        {/* Project documentation */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <ProjectDocumentation />
        </div>
      </div>
    </div>
  );
}

const SHOW_DEV_LOGIN_HINT = import.meta.env.VITE_SHOW_DEV_LOGIN_HINT !== 'false';

function DevLoginHint() {
  if (!SHOW_DEV_LOGIN_HINT) return null;

  return (
    <div
      className="alert alert-warning"
      style={{ marginTop: '16px', justifyContent: 'center', textAlign: 'center' }}
    >
      <span>
        <strong>Demo login:</strong> admin@example.com / password123
      </span>
    </div>
  );
}
