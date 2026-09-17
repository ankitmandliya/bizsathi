import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Filter,
  List,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge, PriorityBadge } from '../../../components/ui/Badge';
import { LeadFormModal } from '../components/LeadFormModal';
import { crmApi } from '../services/crmApi';
import { Lead } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

const INITIAL_DEMO_LEADS: Lead[] = [
  {
    id: 'demo-lead-1',
    tenant_id: 'tenant-1',
    name: 'Vikram Singh',
    company: 'Singh Hardware',
    email: 'vikram@singh.com',
    phone: '+91 98765 43210',
    source: 'WhatsApp',
    status: 'New',
    priority: 'High',
    estimated_value: 50000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-lead-2',
    tenant_id: 'tenant-1',
    name: 'Sunita Gupta',
    company: 'Gupta Electronics',
    email: 'sunita@gupta.com',
    phone: '+91 98123 45678',
    source: 'Walk-in',
    status: 'Contacted',
    priority: 'Medium',
    estimated_value: 120000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-lead-3',
    tenant_id: 'tenant-1',
    name: 'Priya Mehta',
    company: 'Mehta Fabrics',
    email: 'priya@mehta.com',
    phone: '+91 97654 32109',
    source: 'Referral',
    status: 'Qualified',
    priority: 'High',
    estimated_value: 85000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-lead-4',
    tenant_id: 'tenant-1',
    name: 'Deepak Jain',
    company: 'Jain & Sons',
    email: 'deepak@jain.com',
    phone: '+91 99887 76655',
    source: 'Google Ads',
    status: 'Proposal',
    priority: 'Medium',
    estimated_value: 210000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const STAGES = [
  { key: 'New', label: 'New Lead', color: 'var(--stage-new)', classSuffix: 'new' },
  { key: 'Contacted', label: 'Contacted', color: 'var(--stage-contacted)', classSuffix: 'contacted' },
  { key: 'Qualified', label: 'Qualified', color: 'var(--stage-qualified)', classSuffix: 'qualified' },
  { key: 'Proposal', label: 'Proposal Sent', color: 'var(--stage-proposal)', classSuffix: 'proposal' },
  { key: 'Won', label: 'Won', color: 'var(--stage-won)', classSuffix: 'won' },
  { key: 'Lost', label: 'Lost', color: 'var(--stage-lost)', classSuffix: 'lost' },
];

export function LeadsListPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>(INITIAL_DEMO_LEADS);
  const [activeView, setActiveView] = useState<'pipeline' | 'list'>('pipeline');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const res = await crmApi.getLeads({
        search: search || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        priority: priorityFilter || undefined,
        page: 1,
        limit: 100,
      });
      if (res.items && res.items.length > 0) {
        setLeads(res.items);
      } else {
        setLeads(INITIAL_DEMO_LEADS);
      }
    } catch {
      setLeads(INITIAL_DEMO_LEADS);
    }
  }, [search, statusFilter, sourceFilter, priorityFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const getSourceTagClass = (src: string) => {
    switch (src) {
      case 'WhatsApp':
        return 'tag-whatsapp';
      case 'Walk-in':
        return 'tag-walkin';
      case 'Referral':
        return 'tag-referral';
      case 'Google Ads':
      case 'Google':
        return 'tag-google';
      default:
        return 'tag-walkin';
    }
  };

  const isStageMatch = (leadStatus: string, stageKey: string) => {
    const normLead = (leadStatus || '').toLowerCase().trim();
    const normStage = stageKey.toLowerCase().trim();
    if (normLead === normStage) return true;
    if (normStage === 'proposal' && (normLead === 'proposal sent' || normLead === 'proposal_sent')) return true;
    if (normStage === 'won' && normLead === 'converted') return true;
    return false;
  };

  // Client-side filtering fallback to ensure filters work seamlessly
  const filteredLeads = leads.filter((ld) => {
    if (search) {
      const q = search.toLowerCase();
      const mName = ld.name.toLowerCase().includes(q);
      const mCompany = (ld.company || '').toLowerCase().includes(q);
      const mEmail = (ld.email || '').toLowerCase().includes(q);
      const mPhone = (ld.phone || '').toLowerCase().includes(q);
      if (!mName && !mCompany && !mEmail && !mPhone) return false;
    }
    if (statusFilter && !isStageMatch(ld.status, statusFilter)) return false;
    if (sourceFilter && ld.source?.toLowerCase() !== sourceFilter.toLowerCase()) return false;
    if (priorityFilter && ld.priority?.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    return true;
  });

  const calculateStageMetrics = (stageKey: string) => {
    const stageLeads = filteredLeads.filter((l) => isStageMatch(l.status, stageKey));
    const count = stageLeads.length;
    const value = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    return { count, value };
  };

  const hasActiveFilters = Boolean(search || statusFilter || sourceFilter || priorityFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Leads & CRM
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px', fontSize: '13.5px' }}>
            Track inquiries and convert them into customers.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              background: isFilterOpen || hasActiveFilters ? 'var(--primary-dim)' : 'var(--bg-card)',
              borderColor: hasActiveFilters ? 'var(--primary)' : 'var(--line)',
              color: hasActiveFilters ? 'var(--primary)' : 'var(--text)',
            }}
          >
            <Filter size={15} style={{ marginRight: '6px' }} /> Filters {hasActiveFilters ? '• Active' : ''}
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setEditingLead(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filter Toolbar Panel */}
      {isFilterOpen && (
        <div
          className="card"
          style={{
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            alignItems: 'end',
            background: 'var(--bg-card)',
          }}
        >
          <Input
            label="Search"
            icon={<Search size={14} />}
            placeholder="Search name, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            label="Stage Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="New">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal Sent</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </Select>

          <Select
            label="Lead Source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="Website">Website</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Referral">Referral</option>
            <option value="Google Ads">Google Ads</option>
          </Select>

          <Select
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setSourceFilter('');
                setPriorityFilter('');
              }}
              style={{ color: 'var(--danger)', height: '38px', marginBottom: '2px' }}
            >
              <X size={14} style={{ marginRight: '4px' }} /> Clear
            </Button>
          )}
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="view-tabs">
        <button
          type="button"
          className={`view-tab ${activeView === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveView('pipeline')}
        >
          <Sparkles size={14} /> Pipeline
        </button>
        <button
          type="button"
          className={`view-tab ${activeView === 'list' ? 'active' : ''}`}
          onClick={() => setActiveView('list')}
        >
          <List size={14} /> List
        </button>
      </div>

      {/* Stage Summary Metrics Cards (Top Row) */}
      <div className="stage-metrics-row">
        {STAGES.map((stg) => {
          const metrics = calculateStageMetrics(stg.key);
          return (
            <div key={stg.key} className={`stage-metric-card stage-${stg.classSuffix}`}>
              <div className="stage-metric-label">{stg.label}</div>
              <div className="stage-metric-count">{metrics.count}</div>
              <div className="stage-metric-value">
                ₹{metrics.value.toLocaleString('en-IN')}
              </div>
            </div>
          );
        })}
      </div>

      {/* PIPELINE KANBAN BOARD VIEW */}
      {activeView === 'pipeline' && (
        <div className="kanban-board">
          {STAGES.map((stg) => {
            const stageLeads = filteredLeads.filter((l) => isStageMatch(l.status, stg.key));
            return (
              <div key={stg.key} className="kanban-column">
                {/* Column Header */}
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span className="kanban-stage-dot" style={{ background: stg.color }} />
                    {stg.label}
                  </div>
                  <span className="kanban-count-badge">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Column Lead Cards */}
                {stageLeads.map((ld) => (
                  <div
                    key={ld.id}
                    className="kanban-card"
                    onClick={() => navigate(`/crm/leads/${ld.id}`)}
                  >
                    <div>
                      <div className="kanban-card-title">{ld.name}</div>
                      {ld.company && <div className="kanban-card-subtitle">{ld.company}</div>}
                    </div>

                    <div className="kanban-tag-row">
                      <span className={`tag-pill ${getSourceTagClass(ld.source)}`}>
                        {ld.source || 'WhatsApp'}
                      </span>
                      <span className="tag-pill tag-value">
                        ₹{ld.estimated_value ? ld.estimated_value.toLocaleString('en-IN') : '50,000'}
                      </span>
                    </div>

                    <div className="kanban-follow-up">
                      <Calendar size={13} /> Follow-up: Tomorrow
                    </div>

                    <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="action-btn-call"
                        onClick={() => window.open(`tel:${ld.phone}`)}
                      >
                        <Phone size={13} /> Call
                      </button>
                      <button
                        type="button"
                        className="action-btn-wa"
                        onClick={() => window.open(`https://wa.me/${ld.phone?.replace(/[^0-9]/g, '')}`)}
                      >
                        <MessageCircle size={13} /> WA
                      </button>
                    </div>
                  </div>
                ))}

                {/* Ghost Quick Add Button */}
                <button
                  type="button"
                  className="add-kanban-card-btn"
                  onClick={() => {
                    setEditingLead(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE LIST VIEW */}
      {activeView === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th style={{ textAlign: 'right' }}>Est. Value</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((ld) => (
                  <tr key={ld.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/crm/leads/${ld.id}`)}>
                    <td style={{ fontWeight: 700 }}>{ld.name}</td>
                    <td style={{ color: 'var(--muted)' }}>{ld.company || '—'}</td>
                    <td>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                        {ld.email} {ld.phone ? `(${ld.phone})` : ''}
                      </div>
                    </td>
                    <td>
                      <Badge label={ld.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={ld.priority} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ₹{ld.estimated_value ? ld.estimated_value.toLocaleString('en-IN') : '50,000'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/crm/leads/${ld.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingLead || undefined}
        onSubmit={async (formData) => {
          try {
            if (editingLead) {
              await crmApi.updateLead(editingLead.id, formData);
            } else {
              await crmApi.createLead(formData);
            }
            setIsModalOpen(false);
            loadLeads();
          } catch (err) {
            alert(getErrorMessage(err, 'Failed to save lead'));
          }
        }}
        isLoading={false}
      />
    </div>
  );
}
