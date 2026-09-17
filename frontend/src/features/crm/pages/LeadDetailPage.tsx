import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Edit, Globe, Mail, MapPin, Phone, UserCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge, PriorityBadge } from '../../../components/ui/Badge';
import { StateViews } from '../../../components/common/StateViews';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { LeadFormModal } from '../components/LeadFormModal';
import { ActivityFormData, LeadFormData } from '../schemas/crmSchemas';
import { crmApi } from '../services/crmApi';
import { Activity, Lead } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLeadDetails = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [leadData, activityList] = await Promise.all([
        crmApi.getLead(id),
        crmApi.getActivities({ lead_id: id }),
      ]);
      setLead(leadData);
      setActivities(activityList);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load lead details'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLeadDetails();
  }, [loadLeadDetails]);

  const handleUpdateLead = async (data: LeadFormData) => {
    if (!id) return;
    try {
      setIsSubmitting(true);
      const updated = await crmApi.updateLead(id, data);
      setLead(updated);
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Update failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (!lead || !id) return;
    if (!window.confirm(`Convert "${lead.name}" to Customer?`)) return;
    try {
      await crmApi.convertLead(id);
      await loadLeadDetails();
      alert('Lead successfully converted to Customer!');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Conversion failed'));
    }
  };

  const handleLogActivity = async (data: ActivityFormData) => {
    if (!id) return;
    try {
      await crmApi.createActivity({ ...data, lead_id: id });
      const updatedActivities = await crmApi.getActivities({ lead_id: id });
      setActivities(updatedActivities);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to log activity'));
    }
  };

  const handleToggleActivityComplete = async (act: Activity) => {
    try {
      const newStatus = act.status === 'completed' ? 'pending' : 'completed';
      await crmApi.updateActivity(act.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      });
      if (id) {
        const updated = await crmApi.getActivities({ lead_id: id });
        setActivities(updated);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Toggle failed'));
    }
  };

  const infoRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-2)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back nav + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          className="btn-icon"
          onClick={() => navigate('/crm')}
          aria-label="Back to CRM"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="page-heading-title">
            {lead ? lead.name : 'Lead Details'}
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Lead ID: {id}</p>
        </div>
      </div>

      <StateViews
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !lead}
        onRetry={loadLeadDetails}
      >
        {lead && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Left: Lead profile card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge label={lead.status} />
                  <PriorityBadge priority={lead.priority} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-icon btn-icon-primary"
                    onClick={() => setIsEditModalOpen(true)}
                    title="Edit Lead"
                    aria-label="Edit lead"
                  >
                    <Edit size={14} />
                  </button>
                  {lead.status !== 'Converted' && (
                    <Button size="sm" onClick={handleConvert} icon={<UserCheck size={13} />}>
                      Convert
                    </Button>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={infoRow}>
                  <Building2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{lead.company || 'No Company'}</span>
                  {lead.job_title && (
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>({lead.job_title})</span>
                  )}
                </div>

                {lead.email && (
                  <div style={infoRow}>
                    <Mail size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <a href={`mailto:${lead.email}`} style={{ color: 'var(--primary)', fontSize: '13px' }}>
                      {lead.email}
                    </a>
                  </div>
                )}

                {lead.phone && (
                  <div style={infoRow}>
                    <Phone size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span>{lead.phone}</span>
                  </div>
                )}

                {lead.website && (
                  <div style={infoRow}>
                    <Globe size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <a href={lead.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '13px' }}>
                      {lead.website}
                    </a>
                  </div>
                )}

                {(lead.city || lead.country) && (
                  <div style={infoRow}>
                    <MapPin size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Source', value: lead.source },
                  { label: 'Est. Value', value: `$${lead.estimated_value.toLocaleString()}` },
                  ...(lead.industry ? [{ label: 'Industry', value: lead.industry }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--muted-2)' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {lead.notes && (
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Notes
                  </p>
                  <p style={{
                    fontSize: '12.5px',
                    color: 'var(--text-2)',
                    background: 'var(--panel-alt)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '2px solid var(--primary-strong)',
                    lineHeight: '1.6',
                  }}>
                    {lead.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Activity timeline */}
            <div>
              <ActivityTimeline
                activities={activities}
                onLogActivity={handleLogActivity}
                onToggleComplete={handleToggleActivityComplete}
              />
            </div>
          </div>
        )}
      </StateViews>

      <LeadFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateLead}
        initialData={lead}
        isLoading={isSubmitting}
      />
    </div>
  );
}
