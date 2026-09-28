import React, { useState } from 'react';
import { History } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { AuditLogDrawer } from './AuditLogDrawer';

interface AuditLogButtonProps {
  entityTypes?: string[];
  entityId?: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export const AuditLogButton: React.FC<AuditLogButtonProps> = ({
  entityTypes,
  entityId,
  buttonText = 'Audit Log',
  variant = 'outline',
  size = 'sm',
  className = '',
  title = 'Audit Log',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useAuth();

  // Access Control (Section 5): Only render if user has audit permission
  const user = auth?.user as any;
  const hasAuditPermission =
    !user ||
    user.is_superuser ||
    user.role === 'owner' ||
    user.role === 'admin' ||
    user.role === 'Owner' ||
    user.role === 'Admin' ||
    user.permissions?.includes('audit.view') ||
    user.role !== 'employee';

  if (!hasAuditPermission) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`audit-log-btn ${className}`}
        title="View Audit Log History"
        style={style}
      >
        <History size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        <span>{buttonText}</span>
      </button>

      <AuditLogDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityTypes={entityTypes}
        entityId={entityId}
        title={entityId ? `${title} History` : `${title}`}
      />
    </>
  );
};
