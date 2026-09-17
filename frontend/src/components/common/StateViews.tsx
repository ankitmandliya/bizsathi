import { AlertCircle, CheckCircle2, Inbox, RefreshCw } from 'lucide-react';

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
  return (
    <div className="state-view">
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
      {onRetry && (
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
