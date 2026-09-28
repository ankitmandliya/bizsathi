import React, { useEffect, useState } from 'react';
import { X, Check, ChevronRight, ChevronLeft, Send, Calendar, AlertCircle, Smartphone, Mail, Users } from 'lucide-react';
import { Template, AudienceCountResponse, marketingApi } from '../../services/marketingApi';

interface CampaignWizardModalProps {
  templates: Template[];
  onClose: () => void;
  onCampaignCreated: () => void;
}

export function CampaignWizardModal({ templates, onClose, onCampaignCreated }: CampaignWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'CITY' | 'CUSTOMER_TYPE'>('ALL');
  const [audienceFilterValue, setAudienceFilterValue] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');

  // Audience API Data
  const [audienceData, setAudienceData] = useState<AudienceCountResponse | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Tenant Settings (Single Source of Truth)
  const [tenantSettings, setTenantSettings] = useState<{ whatsapp_enabled: boolean; email_enabled: boolean } | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Filter usable templates
    const usable = templates.filter(t => t.whatsapp_status === 'APPROVED' || (t.email_body && t.email_body.trim().length > 0));
    if (usable.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(usable[0].id);
    }
  }, [templates]);

  useEffect(() => {
    fetchAudienceCount();
  }, [audienceFilter, audienceFilterValue]);

  const fetchAudienceCount = async () => {
    setLoadingAudience(true);
    try {
      const res = await marketingApi.getAudienceCount({
        audience_filter: audienceFilter,
        audience_filter_value: audienceFilterValue || null,
      });
      setAudienceData(res);
    } catch (err: unknown) {
      console.error('Failed to fetch audience count', err);
    } finally {
      setLoadingAudience(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleNextStep1 = () => {
    if (!name.trim()) {
      setError('Please enter a campaign name');
      return;
    }
    if (!selectedTemplateId) {
      setError('Please select a valid template');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (audienceFilter !== 'ALL' && !audienceFilterValue) {
      setError(`Please select a specific ${audienceFilter === 'CITY' ? 'city' : 'customer type'}`);
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleSendNowOrSchedule = async (isScheduled: boolean) => {
    setSending(true);
    setError(null);
    try {
      const campaign = await marketingApi.createCampaign({
        name,
        template_id: selectedTemplateId,
        audience_filter: audienceFilter,
        audience_filter_value: audienceFilterValue || null,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });

      if (!isScheduled) {
        await marketingApi.sendCampaign(campaign.id);
      }

      onCampaignCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute campaign send');
    } finally {
      setSending(false);
    }
  };

  // Determine channels banner message
  const getChannelNoticeMessage = () => {
    if (!selectedTemplate) return '';

    const hasApprovedWa = selectedTemplate.whatsapp_body && selectedTemplate.whatsapp_status === 'APPROVED';
    const hasEmail = !!selectedTemplate.email_body && selectedTemplate.email_body.trim().length > 0;

    // Default assume tenant toggles (will be enforced by backend, UI provides standard explanation)
    if (hasApprovedWa && hasEmail) {
      return 'This campaign will be sent via both WhatsApp and Email for all eligible customers.';
    } else if (hasApprovedWa) {
      return 'This campaign will be sent via WhatsApp only (Email content not specified or Email disabled).';
    } else if (hasEmail) {
      return 'This campaign will be sent via Email only (WhatsApp template not approved or disabled).';
    }
    return 'Please select a template with approved content.';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 750, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Campaign Wizard</h2>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Step {step} of 3</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Wizard Stepper Indicator */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ flex: 1, padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13, borderBottom: step === 1 ? '3px solid #4f46e5' : 'none', color: step === 1 ? '#4f46e5' : 'var(--muted)' }}>
            1. Select Template
          </div>
          <div style={{ flex: 1, padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13, borderBottom: step === 2 ? '3px solid #4f46e5' : 'none', color: step === 2 ? '#4f46e5' : 'var(--muted)' }}>
            2. Choose Audience
          </div>
          <div style={{ flex: 1, padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13, borderBottom: step === 3 ? '3px solid #4f46e5' : 'none', color: step === 3 ? '#4f46e5' : 'var(--muted)' }}>
            3. Review & Send
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* STEP 1: SELECT TEMPLATE */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  CAMPAIGN NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Flash Sale Campaign"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  required
                />
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                CHOOSE TEMPLATE
              </label>

              <div style={{ display: 'grid', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
                {templates.map(t => {
                  const isWaApproved = t.whatsapp_status === 'APPROVED';
                  const hasEmail = !!t.email_body;
                  const isSelectable = isWaApproved || hasEmail;
                  const isSelected = selectedTemplateId === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => isSelectable && setSelectedTemplateId(t.id)}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: isSelected ? '2px solid #4f46e5' : '1px solid var(--line)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
                        cursor: isSelectable ? 'pointer' : 'not-allowed',
                        opacity: isSelectable ? 1 : 0.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}

                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Category: {t.category}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                          <span style={{ color: isWaApproved ? '#166534' : '#991b1b', fontWeight: 600 }}>
                            WhatsApp: {t.whatsapp_status || 'N/A'}
                          </span>
                          <span style={{ color: hasEmail ? '#166534' : 'var(--muted)', fontWeight: 600 }}>
                            Email: {hasEmail ? 'Ready' : 'N/A'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check size={20} color="#4f46e5" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE AUDIENCE */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Select Recipient Segment</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Radio 1: All Customers */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, border: audienceFilter === 'ALL' ? '2px solid #4f46e5' : '1px solid var(--line)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="audience"
                    checked={audienceFilter === 'ALL'}
                    onChange={() => { setAudienceFilter('ALL'); setAudienceFilterValue(''); }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>All Customers</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Send to all active customers in your CRM database</div>
                  </div>
                </label>

                {/* Radio 2: Filter by City */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, border: audienceFilter === 'CITY' ? '2px solid #4f46e5' : '1px solid var(--line)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="audience"
                    checked={audienceFilter === 'CITY'}
                    onChange={() => setAudienceFilter('CITY')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Filter by City</div>
                    {audienceFilter === 'CITY' && (
                      <select
                        value={audienceFilterValue}
                        onChange={e => setAudienceFilterValue(e.target.value)}
                        style={{ marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)' }}
                      >
                        <option value="">-- Select City --</option>
                        {audienceData?.distinct_cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>

                {/* Radio 3: Filter by Customer Type */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, border: audienceFilter === 'CUSTOMER_TYPE' ? '2px solid #4f46e5' : '1px solid var(--line)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="audience"
                    checked={audienceFilter === 'CUSTOMER_TYPE'}
                    onChange={() => setAudienceFilter('CUSTOMER_TYPE')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Filter by Customer Type</div>
                    {audienceFilter === 'CUSTOMER_TYPE' && (
                      <select
                        value={audienceFilterValue}
                        onChange={e => setAudienceFilterValue(e.target.value)}
                        style={{ marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)' }}
                      >
                        <option value="">-- Select Customer Type --</option>
                        <option value="Individual">Individual</option>
                        <option value="Business">Business</option>
                      </select>
                    )}
                  </div>
                </label>
              </div>

              {/* Dynamic Audience Preview Badge */}
              <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(99, 102, 241, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={20} color="#4f46e5" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {loadingAudience ? 'Calculating audience...' : `${audienceData?.total_customers ?? 0} Target Customers`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      WhatsApp eligible: {audienceData?.whatsapp_eligible ?? 0} | Email eligible: {audienceData?.email_eligible ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & SEND */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Campaign Review & Channel Enforcement</h3>

              {/* Plain Language Channel Notice Banner */}
              <div style={{ padding: 16, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {getChannelNoticeMessage()}
                </div>
              </div>

              {/* Campaign Summary Card */}
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: 18, borderRadius: 12, border: '1px solid var(--line)', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div><strong>Campaign Name:</strong> {name}</div>
                  <div><strong>Selected Template:</strong> {selectedTemplate?.name}</div>
                  <div><strong>Audience Filter:</strong> {audienceFilter} ({audienceFilterValue || 'All'})</div>
                  <div><strong>Target Audience:</strong> {audienceData?.total_customers ?? 0} customers</div>
                </div>
              </div>

              {/* Schedule Optional */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  SCHEDULE FOR LATER (OPTIONAL)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--line)', cursor: 'pointer', fontWeight: 600 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <span />}

          {step === 1 && (
            <button
              type="button"
              onClick={handleNextStep1}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Next: Audience <ChevronRight size={16} />
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleNextStep2}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Next: Review <ChevronRight size={16} />
            </button>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', gap: 10 }}>
              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => handleSendNowOrSchedule(true)}
                  disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
                >
                  <Calendar size={16} /> Schedule Campaign
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendNowOrSchedule(false)}
                disabled={sending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, background: '#22c55e', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
              >
                <Send size={16} /> {sending ? 'Dispatching...' : 'Send Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
