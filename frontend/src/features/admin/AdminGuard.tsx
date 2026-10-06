import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user === null) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Verifying platform admin permissions…</div>
      </div>
    );
  }

  if (!user?.is_platform_admin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center" style={{ marginTop: '60px' }}>
        <div className="alert alert-error" style={{ padding: '24px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Access Denied (403)</h2>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            You do not have Platform Admin privileges to access the Super Admin console.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: 'var(--primary, #3b82f6)',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Return to Business Workspace
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
