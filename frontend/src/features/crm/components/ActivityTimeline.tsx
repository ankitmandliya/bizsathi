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
  Sparkles,
  Tag,
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

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Call: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Meeting: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  Email: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  WhatsApp: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  Task: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  Note: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

function getTypeIcon(type: string) {
  const cfg = TYPE_COLORS[type] || TYPE_COLORS.Note;
  const props = { size: 16, style: { color: cfg.text } };
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
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" /> Activities & Engagement Logs
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '3px 0 0' }}>
            Track client calls, emails, meetings, and follow-up notes
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsModalOpen(true)}
        >
          Log Activity
        </Button>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', background: 'var(--panel-alt)', borderRadius: '12px', border: '1px dashed var(--line)' }}>
          <FileText size={32} style={{ color: 'var(--muted)', margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 700, margin: 0, color: 'var(--text)' }}>No Activities Recorded</p>
          <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Click "Log Activity" to start tracking client touchpoints.</p>
        </div>
      ) : (
        <div className="timeline">
          {activities.map((act) => {
            const isCompleted = act.status === 'completed';
            const cfg = TYPE_COLORS[act.type] || TYPE_COLORS.Note;
            return (
              <div key={act.id} className="timeline-item">
                <div className="timeline-dot" style={{ borderColor: cfg.border, background: cfg.bg }}>
                  {getTypeIcon(act.type)}
                </div>

                <div className="timeline-content">
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '99px',
                        background: cfg.bg,
                        color: cfg.text,
                        border: `1px solid ${cfg.border}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
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
                          fontWeight: 700,
                          color: isCompleted ? 'var(--muted)' : 'var(--primary)',
                          background: 'var(--panel-alt)',
                          border: '1px solid var(--line)',
                          padding: '3px 8px',
                          borderRadius: '6px',
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

                  {/* Meta footer */}
                  <div className="timeline-meta" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(act.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {act.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 600 }}>
                        <Calendar size={12} /> Due: {new Date(act.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {act.priority && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: act.priority.toLowerCase() === 'high' ? '#dc2626' : 'var(--muted)' }}>
                        <Tag size={12} /> Priority: {act.priority}
                      </span>
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

