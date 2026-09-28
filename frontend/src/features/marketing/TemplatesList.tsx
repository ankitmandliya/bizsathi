import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Smartphone, Mail, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import { Template, marketingApi } from '../../services/marketingApi';
import { TemplateEditorModal } from './TemplateEditorModal';

interface TemplatesListProps {
  templates: Template[];
  onRefresh: () => void;
}

export function TemplatesList({ templates, onRefresh }: TemplatesListProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (tmpl: Template) => {
    setSelectedTemplate(tmpl);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await marketingApi.deleteTemplate(id);
      onRefresh();
    } catch {
      alert('Failed to delete template');
    }
  };

  const handleQuickApprovalCheck = async (id: string) => {
    try {
      await marketingApi.checkTemplateApproval(id, 'APPROVED');
      onRefresh();
    } catch {
      alert('Failed to update approval status');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Communication Templates</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>
            Create reusable WhatsApp & Email templates with variable placeholders
          </p>
        </div>
        <button
          onClick={handleCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} /> Create Template
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {templates.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', color: 'var(--muted)' }}>
            No communication templates found. Click "Create Template" to get started!
          </div>
        ) : (
          templates.map(t => {
            const hasWa = !!t.whatsapp_body;
            const hasEmail = !!t.email_body;

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',

                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.name}</h3>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'rgba(99,102,241,0.1)',
                        color: '#4f46e5',
                      }}
                    >
                      {t.category}
                    </span>
                  </div>

                  {/* WhatsApp Channel Badge */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Smartphone size={16} color={hasWa ? '#22c55e' : 'var(--muted)'} />
                    <span style={{ fontWeight: 600, color: hasWa ? 'var(--text)' : 'var(--muted)' }}>
                      WhatsApp:
                    </span>
                    {hasWa ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            t.whatsapp_status === 'APPROVED'
                              ? '#f0fdf4'
                              : t.whatsapp_status === 'PENDING_APPROVAL'
                              ? '#fefce8'
                              : '#fef2f2',
                          color:
                            t.whatsapp_status === 'APPROVED'
                              ? '#166534'
                              : t.whatsapp_status === 'PENDING_APPROVAL'
                              ? '#854d0e'
                              : '#991b1b',
                        }}
                      >
                        {t.whatsapp_status || 'DRAFT'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Not configured</span>
                    )}
                  </div>

                  {/* Email Channel Badge */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Mail size={16} color={hasEmail ? '#6366f1' : 'var(--muted)'} />
                    <span style={{ fontWeight: 600, color: hasEmail ? 'var(--text)' : 'var(--muted)' }}>
                      Email:
                    </span>
                    {hasEmail ? (
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                        Ready
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Not configured</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {hasWa && t.whatsapp_status !== 'APPROVED' ? (
                    <button
                      onClick={() => handleQuickApprovalCheck(t.id)}
                      style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Check/Approve Status
                    </button>
                  ) : <span />}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEdit(t)}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 4 }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <TemplateEditorModal
          template={selectedTemplate}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
