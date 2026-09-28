import React, { useState } from 'react';
import { X, Send, Eye, Code, CheckCircle, Smartphone, Mail } from 'lucide-react';
import { Template, marketingApi } from '../../services/marketingApi';

interface TemplateEditorModalProps {
  template?: Template | null;
  onClose: () => void;
  onSaved: () => void;
}

const AVAILABLE_VARIABLES = [
  { tag: '{{customer_name}}', label: 'Customer Name' },
  { tag: '{{customer_company}}', label: 'Company' },
  { tag: '{{business_name}}', label: 'My Business Name' },
  { tag: '{{invoice_number}}', label: 'Invoice # (Invoice cat.)' },
  { tag: '{{amount}}', label: 'Amount (Invoice cat.)' },
  { tag: '{{due_date}}', label: 'Due Date (Invoice cat.)' },
];

export function TemplateEditorModal({ template, onClose, onSaved }: TemplateEditorModalProps) {
  const [activeChannelTab, setActiveChannelTab] = useState<'whatsapp' | 'email'>('whatsapp');

  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'Offer');
  const [whatsappBody, setWhatsappBody] = useState(template?.whatsapp_body || '');
  const [emailSubject, setEmailSubject] = useState(template?.email_subject || '');
  const [emailBody, setEmailBody] = useState(template?.email_body || '');

  const [saving, setSaving] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insertVariable = (tag: string, field: 'whatsapp' | 'email_sub' | 'email_body') => {
    if (field === 'whatsapp') {
      setWhatsappBody(prev => prev + ' ' + tag);
    } else if (field === 'email_sub') {
      setEmailSubject(prev => prev + ' ' + tag);
    } else {
      setEmailBody(prev => prev + ' ' + tag);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (template) {
        await marketingApi.updateTemplate(template.id, {
          name,
          category,
          whatsapp_body: whatsappBody,
          email_subject: emailSubject,
          email_body: emailBody,
        });
      } else {
        await marketingApi.createTemplate({
          name,
          category,
          whatsapp_body: whatsappBody,
          email_subject: emailSubject,
          email_body: emailBody,
        });
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApproval = async () => {
    if (!template) return;
    setSubmittingApproval(true);
    setError(null);
    try {
      await marketingApi.submitTemplateApproval(template.id);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit template for WhatsApp approval');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const renderPreviewText = (text: string) => {
    return text
      .replace(/\{\{customer_name\}\}/g, 'Rajesh Kumar')
      .replace(/\{\{customer_company\}\}/g, 'Acme Traders')
      .replace(/\{\{business_name\}\}/g, localStorage.getItem('bizsathi.business_name') || 'BizSathi')
      .replace(/\{\{invoice_number\}\}/g, 'INV-2026-0042')
      .replace(/\{\{amount\}\}/g, '₹24,500')
      .replace(/\{\{due_date\}\}/g, '2026-10-15');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} style={{ padding: 24, flex: 1 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                TEMPLATE NAME
              </label>
              <input
                type="text"
                placeholder="e.g. Festival Season Sale Reminder"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                CATEGORY
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              >
                <option value="Invoice">Invoice</option>
                <option value="Sales">Sales</option>
                <option value="Stock">Stock</option>
                <option value="Offer">Offer</option>
              </select>
            </div>
          </div>

          {/* Channels Tab Toggle */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setActiveChannelTab('whatsapp')}
              style={{
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 14,
                background: 'none',
                border: 'none',
                borderBottom: activeChannelTab === 'whatsapp' ? '2.5px solid #22c55e' : '2.5px solid transparent',
                color: activeChannelTab === 'whatsapp' ? '#22c55e' : 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Smartphone size={16} /> WhatsApp Message
            </button>
            <button
              type="button"
              onClick={() => setActiveChannelTab('email')}
              style={{
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 14,
                background: 'none',
                border: 'none',
                borderBottom: activeChannelTab === 'email' ? '2.5px solid #6366f1' : '2.5px solid transparent',
                color: activeChannelTab === 'email' ? '#6366f1' : 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Mail size={16} /> Email Message
            </button>
          </div>

          {/* WhatsApp Channel Tab */}
          {activeChannelTab === 'whatsapp' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>WHATSAPP MESSAGE TEXT</label>
                  <span style={{ fontSize: 11, color: template?.whatsapp_status === 'APPROVED' ? '#166534' : '#991b1b', fontWeight: 600 }}>
                    Status: {template?.whatsapp_status || 'DRAFT'}
                  </span>
                </div>

                {/* Variable Buttons Toolbar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => insertVariable(v.tag, 'whatsapp')}
                      style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={8}
                  placeholder="Hi {{customer_name}}, check out our latest offers from {{business_name}}!"
                  value={whatsappBody}
                  onChange={e => setWhatsappBody(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'sans-serif' }}
                />

                {template && template.whatsapp_body && template.whatsapp_status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={handleSubmitApproval}
                    disabled={submittingApproval}
                    style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#22c55e', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    <Send size={14} /> {submittingApproval ? 'Submitting...' : 'Submit for WhatsApp Approval'}
                  </button>
                )}
              </div>

              {/* Live WhatsApp Mobile Preview */}
              <div style={{ background: '#e5ddd5', borderRadius: 16, padding: 16, border: '2px solid #ccc', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#075e54', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={14} /> Live WhatsApp Preview
                </div>
                <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, maxWidth: '85%', fontSize: 13, color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', alignSelf: 'flex-start' }}>
                  {whatsappBody ? renderPreviewText(whatsappBody) : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Message text preview will appear here...</span>}

                  <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'right', marginTop: 4 }}>12:45 PM ✓✓</div>
                </div>
              </div>
            </div>
          )}

          {/* Email Channel Tab */}
          {activeChannelTab === 'email' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>EMAIL SUBJECT</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => insertVariable(v.tag, 'email_sub')}
                      style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Special Offer for {{customer_name}}"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>EMAIL BODY (HTML / Plain Text)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => insertVariable(v.tag, 'email_body')}
                      style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={8}
                  placeholder="Dear {{customer_name}},\n\nThank you for doing business with {{business_name}}!"
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 8, background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--text)', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
