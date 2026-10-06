import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/api/adminApi';
import { getErrorMessage } from '../../utils/error';

const registerSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  owner_name: z.string().min(2, 'Owner name must be at least 2 characters'),
  owner_email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterBusinessPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const response = await adminApi.registerBusiness({
        business_name: data.business_name,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        password: data.password,
      });

      login(response.access_token, response.refresh_token, {
        id: 'new-owner-id',
        email: data.owner_email,
        full_name: data.owner_name,
      });

      navigate('/dashboard');
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'));
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

        <h1 className="auth-title">Register Your Business</h1>
        <p className="auth-subtitle">Get started with your company operating hub in seconds.</p>

        {serverError && (
          <div className="alert alert-error" style={{ marginTop: '16px' }}>
            {serverError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Business / Company Name"
            placeholder="e.g. Ramesh Traders"
            error={errors.business_name?.message}
            {...register('business_name')}
          />

          <Input
            label="Your Full Name"
            placeholder="e.g. Ramesh Kumar"
            error={errors.owner_name?.message}
            {...register('owner_name')}
          />

          <Input
            label="Work Email"
            type="email"
            placeholder="ramesh@traders.com"
            error={errors.owner_email?.message}
            {...register('owner_email')}
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
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? 'Creating Business Workspace…' : 'Create Business Workspace'}
          </Button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
