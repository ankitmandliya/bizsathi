import React from 'react';
import { X, Clock } from 'lucide-react';
import { AuditLogView } from './AuditLogView';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityTypes?: string[];
  entityId?: string;
  title?: string;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  isOpen,
  onClose,
  entityTypes,
  entityId,
  title = 'Audit Log',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="audit-log-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="audit-log-drawer-panel">
        {/* Drawer Header */}
        <div className="audit-log-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                {title}
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
                Activity and change timeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden', background: 'var(--bg)' }}>
          <AuditLogView
            entityTypes={entityTypes}
            entityId={entityId}
            showEntityFilter={!entityTypes || entityTypes.length === 0}
          />
        </div>
      </div>
    </div>
  );
};
