import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/api/adminApi';
import { getErrorMessage } from '../../utils/error';

const setupSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function CompleteSetupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  });

  const onSubmit = async (data: SetupFormData) => {
    setServerError(null);
    if (!token) {
      setServerError('Invalid or missing setup token from URL link.');
      return;
    }

    try {
      await adminApi.completeSetup({
        token,
        password: data.password,
      });
      setSuccessMsg('Your account setup is complete! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, 'Failed to complete setup. Link may be invalid or expired.'));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.15), transparent), var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="auth-logo">
          <div className="brand-mark"></div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>BizSathi</span>
        </div>

        <h1 className="auth-title">Complete Account Setup</h1>
        <p className="auth-subtitle">Set your secure password to activate your provisioned business workspace.</p>

        {serverError && (
          <div className="alert alert-error" style={{ marginTop: '16px' }}>
            {serverError}
          </div>
        )}

        {successMsg ? (
          <div className="alert alert-success" style={{ marginTop: '16px', textAlign: 'center' }}>
            {successMsg}
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Set New Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isSubmitting}
              style={{ marginTop: '8px' }}
            >
              {isSubmitting ? 'Activating Account…' : 'Activate & Complete Setup'}
            </Button>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
          Back to{' '}
          <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Sign In Page
          </Link>
        </div>
      </div>
    </div>
  );
}
