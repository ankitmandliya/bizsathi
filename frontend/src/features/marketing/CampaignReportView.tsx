import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Send, RefreshCw, Smartphone, Mail } from 'lucide-react';
import { CampaignDetail, marketingApi } from '../../services/marketingApi';

interface CampaignReportViewProps {
  campaignId: string;
  onBack: () => void;
}

export function CampaignReportView({ campaignId, onBack }: CampaignReportViewProps) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'WHATSAPP' | 'EMAIL'>('ALL');

  useEffect(() => {
    loadDetail();
  }, [campaignId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await marketingApi.getCampaignDetail(campaignId);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load campaign report detail', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading Campaign Report...</div>;
  }

  if (!detail) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Campaign report not found.</p>
        <button onClick={onBack} style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none' }}>
          Back to Campaigns
        </button>
      </div>
    );
  }

  const filteredRecipients = detail.recipients.filter(
    r => filterChannel === 'ALL' || r.channel === filterChannel
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{detail.name}</h1>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Template: {detail.template_name} | Filter: {detail.audience_filter}
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>TOTAL RECIPIENTS</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{detail.total_recipients}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 4 }}>SENT</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>{detail.sent_count}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 4 }}>DELIVERED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>{detail.delivered_count}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>FAILED / SKIPPED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#991b1b' }}>{detail.failed_count}</div>
        </div>
      </div>

      {/* Actual Channels Used Info */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99, 102, 241, 0.08)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
        <span>Delivery Channels Enforced:</span>
        {detail.actual_channels_used.map(c => (
          <span key={c} style={{ padding: '2px 8px', borderRadius: 12, background: '#fff', fontSize: 12, fontWeight: 700 }}>
            {c}
          </span>
        ))}
      </div>

      {/* Recipients Table Header & Filters */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recipient Delivery Log</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setFilterChannel('ALL')}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: filterChannel === 'ALL' ? '#4f46e5' : 'var(--line)', color: filterChannel === 'ALL' ? '#fff' : 'var(--text)', cursor: 'pointer' }}
            >
              All
            </button>
            <button
              onClick={() => setFilterChannel('WHATSAPP')}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: filterChannel === 'WHATSAPP' ? '#22c55e' : 'var(--line)', color: filterChannel === 'WHATSAPP' ? '#fff' : 'var(--text)', cursor: 'pointer' }}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setFilterChannel('EMAIL')}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: filterChannel === 'EMAIL' ? '#6366f1' : 'var(--line)', color: filterChannel === 'EMAIL' ? '#fff' : 'var(--text)', cursor: 'pointer' }}
            >
              Email
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontSize: 12 }}>
              <th style={{ padding: 12 }}>CUSTOMER</th>
              <th style={{ padding: 12 }}>CHANNEL</th>
              <th style={{ padding: 12 }}>STATUS</th>
              <th style={{ padding: 12 }}>ERROR / NOTE</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecipients.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                  No recipients recorded for this selection.
                </td>
              </tr>
            ) : (
              filteredRecipients.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{r.customer_name || 'Customer'}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                      {r.channel === 'WHATSAPP' ? <Smartphone size={14} color="#22c55e" /> : <Mail size={14} color="#6366f1" />}
                      {r.channel}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        background: r.status === 'SENT' || r.status === 'DELIVERED' ? '#f0fdf4' : '#fef2f2',
                        color: r.status === 'SENT' || r.status === 'DELIVERED' ? '#166534' : '#991b1b',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: 12, color: 'var(--muted)', fontSize: 13 }}>
                    {r.error_reason || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
