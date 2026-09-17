import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Edit, UserCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StateViews } from '../../../components/common/StateViews';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { DealFormModal } from '../components/DealFormModal';
import { ActivityFormData, DealFormData } from '../schemas/crmSchemas';
import { crmApi } from '../services/crmApi';
import { Activity, Deal, Lead, PipelineStage } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDealDetails = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [dealData, stagesData, activityList, leadsData] = await Promise.all([
        crmApi.getDeal(id),
        crmApi.getPipelineStages(),
        crmApi.getActivities({ deal_id: id }),
        crmApi.getLeads({ limit: 100 }),
      ]);
      setDeal(dealData);
      setStages(stagesData);
      setActivities(activityList);
      setLeads(leadsData.items);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load deal details'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDealDetails();
  }, [loadDealDetails]);

  const handleStageChange = async (newStageId: string) => {
    if (!deal || !id) return;
    try {
      const updated = await crmApi.updateDeal(id, { stage_id: newStageId });
      setDeal(updated);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Stage change failed'));
    }
  };

  const handleUpdateDeal = async (data: DealFormData) => {
    if (!id) return;
    try {
      setIsSubmitting(true);
      const updated = await crmApi.updateDeal(id, data);
      setDeal(updated);
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Update failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogActivity = async (data: ActivityFormData) => {
    if (!id) return;
    try {
      await crmApi.createActivity({ ...data, deal_id: id });
      const updatedActivities = await crmApi.getActivities({ deal_id: id });
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
        const updated = await crmApi.getActivities({ deal_id: id });
        setActivities(updated);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Toggle failed'));
    }
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
          <h1 className="page-heading-title">{deal ? deal.title : 'Deal Details'}</h1>
          <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Deal ID: {id}</p>
        </div>
      </div>

      <StateViews
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !deal}
        onRetry={loadDealDetails}
      >
        {deal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Pipeline stepper */}
            <div className="card">
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Pipeline Stage
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stages.length, 6)}, 1fr)`, gap: '8px' }}>
                {stages.map((stg, idx) => {
                  const isCurrent = deal.stage_id === stg.id;
                  const isPast = deal.stage ? deal.stage.order > stg.order : false;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => handleStageChange(stg.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all var(--t-base)',
                        background: isCurrent
                          ? 'var(--primary-strong)'
                          : isPast
                          ? 'var(--primary-dim)'
                          : 'var(--panel-alt)',
                        borderColor: isCurrent
                          ? 'transparent'
                          : isPast
                          ? 'rgba(96,165,250,0.3)'
                          : 'var(--line)',
                        color: isCurrent ? 'white' : isPast ? 'var(--primary-hover)' : 'var(--muted-2)',
                        transform: isCurrent ? 'scale(1.04)' : 'none',
                        boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                        {isPast && <Check size={11} />}
                        <span>{idx + 1}. {stg.name}</span>
                      </div>
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>{stg.probability}% prob</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Left: Deal info card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                      ${deal.value.toLocaleString()}
                    </p>
                    <p style={{ fontSize: '11.5px', color: 'var(--muted-2)', marginTop: '2px' }}>
                      Currency: {deal.currency}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-icon btn-icon-primary"
                    onClick={() => setIsEditModalOpen(true)}
                    title="Edit Deal"
                  >
                    <Edit size={14} />
                  </button>
                </div>

                {/* Deal stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Current Stage', value: deal.stage?.name || 'Unknown', color: 'var(--primary-hover)' },
                    { label: 'Win Probability', value: `${deal.probability}%`, color: 'var(--success-text)' },
                    ...(deal.expected_closing_date ? [{
                      label: 'Expected Close',
                      value: new Date(deal.expected_closing_date).toLocaleDateString(),
                      color: 'var(--text)',
                    }] : []),
                    ...(deal.actual_closing_date ? [{
                      label: 'Actual Close',
                      value: new Date(deal.actual_closing_date).toLocaleDateString(),
                      color: 'var(--success-text)',
                    }] : []),
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted-2)' }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Linked lead */}
                {deal.lead_id && (
                  <div style={{ paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                      Linked Lead
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<UserCheck size={13} />}
                      onClick={() => navigate(`/crm/leads/${deal.lead_id}`)}
                      style={{ width: '100%' }}
                    >
                      View Linked Lead
                    </Button>
                  </div>
                )}

                {/* Notes */}
                {deal.notes && (
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
                      {deal.notes}
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
          </div>
        )}
      </StateViews>

      <DealFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateDeal}
        stages={stages}
        leads={leads}
        initialData={deal}
        isLoading={isSubmitting}
      />
    </div>
  );
}
