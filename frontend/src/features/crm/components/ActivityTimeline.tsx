import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Activity } from '../types/crm';
import { ActivityFormModal } from './ActivityFormModal';
import { ActivityFormData } from '../schemas/crmSchemas';

interface ActivityTimelineProps {
  activities: Activity[];
  onLogActivity: (data: ActivityFormData) => Promise<void>;
  onToggleComplete?: (activity: Activity) => Promise<void>;
  isLoading?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  Call: '#60a5fa',
  Meeting: '#a78bfa',
  Email: '#fbbf24',
  WhatsApp: '#34d399',
  Task: '#6366f1',
  Note: '#94a3b8',
};

function getTypeIcon(type: string) {
  const color = TYPE_COLORS[type] || '#94a3b8';
  const props = { size: 14, style: { color } };
  switch (type) {
    case 'Call':      return <Phone {...props} />;
    case 'Meeting':   return <Calendar {...props} />;
    case 'Email':     return <Mail {...props} />;
    case 'WhatsApp':  return <MessageSquare {...props} />;
    case 'Task':      return <CheckCircle2 {...props} />;
    default:          return <FileText {...props} />;
  }
}

export function ActivityTimeline({
  activities,
  onLogActivity,
  onToggleComplete,
  isLoading = false,
}: ActivityTimelineProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <p className="panel-card-title">Activities & Notes</p>
          <p style={{ fontSize: '12px', color: 'var(--muted-2)', marginTop: '2px' }}>
            Log calls, meetings, notes, and tasks
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => setIsModalOpen(true)}
        >
          Log Activity
        </Button>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted-2)', fontSize: '13px' }}>
          No activities logged yet. Click "Log Activity" to start tracking.
        </div>
      ) : (
        <div className="timeline">
          {activities.map((act) => {
            const isCompleted = act.status === 'completed';
            const dotColor = TYPE_COLORS[act.type] || 'var(--muted)';
            return (
              <div key={act.id} className="timeline-item">
                <div className="timeline-dot" style={{ borderColor: `${dotColor}40`, background: `${dotColor}15` }}>
                  {getTypeIcon(act.type)}
                </div>

                <div className="timeline-content">
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        background: `${dotColor}15`,
                        color: dotColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {act.type}
                      </span>
                      <span className="timeline-title" style={isCompleted ? { textDecoration: 'line-through', color: 'var(--muted)' } : {}}>
                        {act.subject}
                      </span>
                    </div>

                    {onToggleComplete && act.type === 'Task' && (
                      <button
                        type="button"
                        onClick={() => onToggleComplete(act)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isCompleted ? 'var(--muted-2)' : 'var(--primary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isCompleted ? 'Mark Pending' : 'Mark Done'}
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  {act.description && (
                    <div className="timeline-note">{act.description}</div>
                  )}

                  {/* Meta */}
                  <div className="timeline-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '5px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} />
                      {new Date(act.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {act.due_date && (
                      <span>Due: {new Date(act.due_date).toLocaleDateString()}</span>
                    )}
                    {act.priority && (
                      <span>Priority: {act.priority}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActivityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={onLogActivity}
        isLoading={isLoading}
      />
    </div>
  );
}
