import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, FileText, Send, Eye, Calendar, Clock, BarChart2 } from 'lucide-react';
import { Campaign, Template, marketingApi } from '../../services/marketingApi';
import { TemplatesList } from './TemplatesList';
import { CampaignWizardModal } from './CampaignWizardModal';
import { CampaignReportView } from './CampaignReportView';
import { AuditLogButton } from '../../components/common/AuditLogButton';

export function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [camps, tmpls] = await Promise.all([
        marketingApi.getCampaigns(),
        marketingApi.getTemplates(),
      ]);
      setCampaigns(camps || []);
      setTemplates(tmpls || []);
    } catch (err) {
      console.error('Failed to load marketing data', err);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCampaignId) {
    return (
      <div style={{ padding: 24, maxWidth: 1100 }}>
        <CampaignReportView campaignId={selectedCampaignId} onBack={() => setSelectedCampaignId(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={18} color="#fff" />
            </div>
            WhatsApp & Email Campaigns
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 14 }}>
            Create broadcast campaigns, manage Meta-approved WhatsApp templates, and inspect delivery reports
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AuditLogButton entityTypes={['campaign', 'template']} title="Marketing Audit Log" />
          <button
            onClick={() => setIsWizardOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('campaigns')}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'campaigns' ? '2.5px solid #4f46e5' : '2.5px solid transparent', color: activeTab === 'campaigns' ? '#4f46e5' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Send size={16} /> Broadcast Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'templates' ? '2.5px solid #4f46e5' : '2.5px solid transparent', color: activeTab === 'templates' ? '#4f46e5' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <FileText size={16} /> Templates ({templates.length})
        </button>
      </div>

      {/* Tab Content 1: Campaigns */}
      {activeTab === 'campaigns' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              No broadcast campaigns launched yet. Click "New Campaign" to launch a WhatsApp or Email broadcast!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontSize: 12 }}>
                  <th style={{ padding: 12 }}>CAMPAIGN NAME</th>
                  <th style={{ padding: 12 }}>TEMPLATE</th>
                  <th style={{ padding: 12 }}>AUDIENCE FILTER</th>
                  <th style={{ padding: 12 }}>STATUS</th>
                  <th style={{ padding: 12 }}>CREATED</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>{c.name}</td>
                    <td style={{ padding: 12, color: 'var(--muted)' }}>{c.template_name || 'Template'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', fontSize: 12 }}>
                        {c.audience_filter} {c.audience_filter_value ? `(${c.audience_filter_value})` : ''}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: c.status === 'SENT' ? '#f0fdf4' : c.status === 'SCHEDULED' ? '#fefce8' : 'rgba(0,0,0,0.05)',
                          color: c.status === 'SENT' ? '#166534' : c.status === 'SCHEDULED' ? '#854d0e' : 'var(--text)',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedCampaignId(c.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                      >
                        <BarChart2 size={14} /> View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content 2: Templates */}
      {activeTab === 'templates' && (
        <TemplatesList templates={templates} onRefresh={loadData} />
      )}

      {/* Campaign 3-Step Wizard Modal */}
      {isWizardOpen && (
        <CampaignWizardModal
          templates={templates}
          onClose={() => setIsWizardOpen(false)}
          onCampaignCreated={() => {
            setIsWizardOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
