import { AlertCircle, CheckCircle2, Inbox, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LoadingView({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="state-view">
      <div className="spinner" />
      <p style={{ fontSize: '13px', color: 'var(--muted-2)' }}>{message}</p>
    </div>
  );
}

export function ErrorView({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const navigate = useNavigate();
  const isUpgradeMsg =
    message.toLowerCase().includes('upgrade') ||
    message.toLowerCase().includes("plan doesn't include") ||
    message.toLowerCase().includes('limit reached');

  return (
    <div className="state-view" style={{ flexDirection: 'column', gap: '12px' }}>
      <div
        className="state-view-icon"
        style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}
      >
        <AlertCircle size={24} />
      </div>
      <div>
        <p className="state-view-title">{title}</p>
        <p className="state-view-desc">{message}</p>
      </div>

      {isUpgradeMsg && (
        <button
          type="button"
          onClick={() => navigate('/subscriptions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            marginTop: '4px',
          }}
        >
          <ArrowUpRight size={16} />
          View Plans & Upgrade
        </button>
      )}

      {onRetry && !isUpgradeMsg && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: '4px' }}
        >
          <RefreshCw size={13} />
          Try again
        </button>
      )}
    </div>
  );
}

export function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const navigate = useNavigate();
  const isUpgradeMsg =
    message.toLowerCase().includes('upgrade') ||
    message.toLowerCase().includes("plan doesn't include") ||
    message.toLowerCase().includes('limit reached');

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: '10px',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        color: '#ef4444',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <span>{message}</span>
      </div>

      {isUpgradeMsg && (
        <button
          type="button"
          onClick={() => navigate('/subscriptions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowUpRight size={14} />
          View Plans & Upgrade
        </button>
      )}

      {onRetry && !isUpgradeMsg && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: '1px solid currentColor',
            color: 'inherit',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}

export function ModuleAccessDeniedView({ moduleName }: { moduleName?: string }) {
  const navigate = useNavigate();
  return (
    <div
      className="state-view"
      style={{
        flexDirection: 'column',
        gap: '16px',
        padding: '40px 20px',
        textAlign: 'center',
        background: 'var(--card-bg, #1e293b)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #334155)',
        margin: '20px auto',
        maxWidth: '500px',
      }}
    >
      <div
        className="state-view-icon"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', width: '56px', height: '56px' }}
      >
        <ArrowUpRight size={28} />
      </div>
      <div>
        <p className="state-view-title" style={{ fontSize: '18px', fontWeight: 800 }}>
          Module Not Included in Current Plan
        </p>
        <p className="state-view-desc" style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>
          {moduleName
            ? `Your active subscription plan does not include access to ${moduleName}.`
            : "Your plan doesn't include this feature — upgrade your plan to unlock full access."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/subscriptions')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
        }}
      >
        <ArrowUpRight size={18} />
        View Plans & Upgrade
      </button>
    </div>
  );
}

export function EmptyView({
  title = 'No items found',
  message = 'Get started by creating your first entry.',
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-view">
      <div
        className="state-view-icon"
        style={{ background: 'var(--panel-alt)', color: 'var(--muted-2)' }}
      >
        <Inbox size={24} />
      </div>
      <div>
        <p className="state-view-title">{title}</p>
        <p className="state-view-desc">{message}</p>
      </div>
      {action && <div style={{ marginTop: '4px' }}>{action}</div>}
    </div>
  );
}

export function SuccessView({ title, message }: { title: string; message?: string }) {
  return (
    <div className="state-view">
      <div
        className="state-view-icon"
        style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}
      >
        <CheckCircle2 size={24} />
      </div>
      <div>
        <p className="state-view-title">{title}</p>
        {message && <p className="state-view-desc">{message}</p>}
      </div>
    </div>
  );
}

export function StateViews({
  isLoading,
  error,
  isEmpty,
  onRetry,
  emptyTitle,
  emptyDescription,
  children,
}: {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
}) {
  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={onRetry} />;
  if (isEmpty) return <EmptyView title={emptyTitle} message={emptyDescription} />;
  return <>{children}</>;
}

