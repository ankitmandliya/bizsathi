import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Edit, Globe, Mail, MapPin, MessageSquare, Phone, UserCheck } from 'lucide-react';
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
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Left: Lead profile card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--shadow-md)' }}>
              {/* Header block with Badges & Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '18px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={lead.status} />
                    <PriorityBadge priority={lead.priority} />
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setIsEditModalOpen(true)}
                    title="Edit Lead"
                    aria-label="Edit lead"
                    style={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: '8px' }}
                  >
                    <Edit size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                    flexShrink: 0
                  }}>
                    {lead.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.name}
                    </h2>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.company ? `${lead.company} ${lead.job_title ? `(${lead.job_title})` : ''}` : 'Individual Contact'}
                    </p>
                  </div>
                </div>

                {lead.status !== 'Converted' && (
                  <Button
                    size="md"
                    onClick={handleConvert}
                    icon={<UserCheck size={16} />}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      justifyContent: 'center',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                      borderRadius: '10px'
                    }}
                  >
                    Convert to Customer
                  </Button>
                )}
              </div>

              {/* Quick Action Contact Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    style={{
                      flex: 1,
                      textDecoration: 'none',
                      padding: '9px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'var(--primary-dim)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Phone size={14} /> Call
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    style={{
                      flex: 1,
                      textDecoration: 'none',
                      padding: '9px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#f3e8ff',
                      color: '#7e22ce',
                      border: '1px solid #e9d5ff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Mail size={14} /> Email
                  </a>
                )}
                {lead.whatsapp && (
                  <a
                    href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      textDecoration: 'none',
                      padding: '9px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <MessageSquare size={14} /> Chat
                  </a>
                )}
              </div>

              {/* Contact info list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--panel-alt)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <div style={infoRow}>
                  <Building2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{lead.company || 'No Company Specified'}</span>
                </div>

                {lead.email && (
                  <div style={infoRow}>
                    <Mail size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <a href={`mailto:${lead.email}`} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
                      {lead.email}
                    </a>
                  </div>
                )}

                {lead.phone && (
                  <div style={infoRow}>
                    <Phone size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <a href={`tel:${lead.phone}`} style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
                      {lead.phone}
                    </a>
                  </div>
                )}

                {lead.website && (
                  <div style={infoRow}>
                    <Globe size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <a href={lead.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
                      {lead.website}
                    </a>
                  </div>
                )}

                {(lead.city || lead.country) && (
                  <div style={infoRow}>
                    <MapPin size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Value</span>
                  <p style={{ fontSize: '17px', fontWeight: 800, color: '#10b981', margin: '4px 0 0', letterSpacing: '-0.3px' }}>
                    ₹{lead.estimated_value.toLocaleString('en-IN')}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.source}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                    Notes & Inquiry Details
                  </p>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--text-2)',
                    background: 'var(--panel-alt)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    borderLeft: '3.5px solid var(--primary)',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    borderTop: '1px solid var(--line)',
                    borderRight: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                  }}>
                    {lead.notes}
                  </div>
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
