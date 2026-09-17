import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  DollarSign,
  Eye,
  Kanban,
  List,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StateViews } from '../../../components/common/StateViews';
import { DealFormModal } from '../components/DealFormModal';
import { DealFormData } from '../schemas/crmSchemas';
import { crmApi } from '../services/crmApi';
import { Deal, Lead, PipelineStage } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

const dealTableHeaders = [
  { key: 'title',       title: 'Deal Title' },
  { key: 'stage',       title: 'Stage' },
  { key: 'value',       title: 'Deal Value' },
  { key: 'probability', title: 'Win Probability' },
  { key: 'closing',     title: 'Expected Close' },
  { key: 'actions',     title: 'Actions' },
];

export function DealsListPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [activeView, setActiveView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [stagesData, dealsData, leadsData] = await Promise.all([
        crmApi.getPipelineStages(),
        crmApi.getDeals({
          stage_id: selectedStageId || undefined,
          search: search || undefined,
          page,
          limit,
        }),
        crmApi.getLeads({ limit: 100 }),
      ]);
      setStages(stagesData);
      setDeals(dealsData.items);
      setTotal(dealsData.total);
      setLeads(leadsData.items);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load deals'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedStageId, search, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOrUpdate = async (data: DealFormData) => {
    try {
      setIsSubmitting(true);
      if (editingDeal) {
        await crmApi.updateDeal(editingDeal.id, data);
      } else {
        await crmApi.createDeal(data);
      }
      setEditingDeal(null);
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Operation failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (deal: Deal) => {
    if (!window.confirm(`Are you sure you want to delete deal "${deal.title}"?`)) return;
    try {
      await crmApi.deleteDeal(deal.id);
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Delete failed'));
    }
  };

  const handleStageChange = async (dealId: string, newStageId: string) => {
    try {
      await crmApi.updateDeal(dealId, { stage_id: newStageId });
      await loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to move deal'));
    }
  };

  // KPIs
  const totalValue = useMemo(() => deals.reduce((sum, d) => sum + (d.value || 0), 0), [deals]);
  const avgValue = useMemo(() => (deals.length > 0 ? totalValue / deals.length : 0), [deals, totalValue]);
  const wonCount = useMemo(() => {
    const wonStage = stages.find((s) => s.is_won || s.name.toLowerCase().includes('won'));
    if (!wonStage) return 0;
    return deals.filter((d) => d.stage_id === wonStage.id).length;
  }, [deals, stages]);
  const winRate = useMemo(() => (deals.length > 0 ? Math.round((wonCount / deals.length) * 100) : 0), [deals.length, wonCount]);

  const stageBadgeStyle = (stageName?: string) => {
    const name = stageName?.toLowerCase() || '';
    if (name.includes('won')) return 'badge badge-success';
    if (name.includes('lost')) return 'badge badge-danger';
    if (name.includes('proposal')) return 'badge badge-warning';
    if (name.includes('negotiation')) return 'badge badge-primary';
    return 'badge badge-neutral';
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Deals Pipeline"
        subtitle="Manage revenue opportunities, track sales stages, and boost conversion rates."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', background: 'var(--panel-alt)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
              <button
                type="button"
                className={`tab-btn ${activeView === 'kanban' ? 'active' : ''}`}
                onClick={() => setActiveView('kanban')}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeView === 'kanban' ? 'var(--panel)' : 'transparent', color: activeView === 'kanban' ? 'var(--text)' : 'var(--muted-2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: activeView === 'kanban' ? 'var(--shadow-sm)' : 'none' }}
              >
                <Kanban size={14} /> Kanban
              </button>
              <button
                type="button"
                className={`tab-btn ${activeView === 'table' ? 'active' : ''}`}
                onClick={() => setActiveView('table')}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeView === 'table' ? 'var(--panel)' : 'transparent', color: activeView === 'table' ? 'var(--text)' : 'var(--muted-2)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: activeView === 'table' ? 'var(--shadow-sm)' : 'none' }}
              >
                <List size={14} /> Table
              </button>
            </div>
            <Button
              icon={<Plus size={15} />}
              onClick={() => {
                setEditingDeal(null);
                setIsModalOpen(true);
              }}
            >
              Add Deal
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Total Pipeline</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
              ₹{totalValue.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Active Deals</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
              {deals.length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Pipeline Win Rate</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
              {winRate}%
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Avg. Deal Size</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
              ₹{Math.round(avgValue).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Pill Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setSelectedStageId('')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedStageId === '' ? 'none' : '1px solid var(--line)',
              background: selectedStageId === '' ? 'var(--primary)' : 'var(--panel)',
              color: selectedStageId === '' ? '#ffffff' : 'var(--text-2)',
              boxShadow: selectedStageId === '' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            All Stages ({deals.length})
          </button>
          {stages.map((stg) => {
            const count = deals.filter((d) => d.stage_id === stg.id).length;
            const isSelected = selectedStageId === stg.id;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setSelectedStageId(stg.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid var(--line)',
                  background: isSelected ? 'var(--primary)' : 'var(--panel)',
                  color: isSelected ? '#ffffff' : 'var(--text-2)',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {stg.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="filter-search" style={{ minWidth: '240px' }}>
          <Search size={14} />
          <input
            placeholder="Search deal title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search deals"
          />
        </div>
      </div>

      {/* Main View: Kanban vs Table */}
      <StateViews
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && deals.length === 0}
        onRetry={loadData}
        emptyTitle="No deals found"
        emptyDescription="Create your first deal to manage your revenue pipeline."
      >
        {activeView === 'kanban' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(260px, 1fr))`, gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            {stages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage_id === stage.id);
              const stageVal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

              return (
                <div
                  key={stage.id}
                  style={{
                    background: 'var(--panel-alt)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    border: '1px solid var(--line)',
                    minHeight: '400px',
                  }}
                >
                  {/* Stage Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{stage.name}</span>
                      <span className="badge badge-neutral" style={{ borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: '11px' }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success-text)' }}>
                      ₹{stageVal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Stage Deal Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    {stageDeals.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--muted)', fontSize: '12px', border: '1px dashed var(--line)', borderRadius: 'var(--radius-md)' }}>
                        No deals in this stage
                      </div>
                    ) : (
                      stageDeals.map((dl) => (
                        <div
                          key={dl.id}
                          className="card"
                          style={{
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                              {dl.title}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                              <button
                                type="button"
                                className="btn-icon btn-icon-primary"
                                onClick={() => navigate(`/crm/deals/${dl.id}`)}
                                title="View Deal"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                onClick={() => handleDelete(dl)}
                                title="Delete Deal"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ₹{dl.value.toLocaleString('en-IN')}
                          </div>

                          {/* Probability */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                              <span>Probability</span>
                              <span>{dl.probability}%</span>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'var(--panel-hover)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${dl.probability}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, var(--primary-strong), var(--primary))',
                                  borderRadius: 'var(--radius-full)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Stage Selector Dropdown */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--line)', marginTop: '2px' }}>
                            {dl.expected_closing_date ? (
                              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={11} /> {new Date(dl.expected_closing_date).toLocaleDateString()}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>—</span>
                            )}
                            <select
                              value={dl.stage_id}
                              onChange={(e) => handleStageChange(dl.id, e.target.value)}
                              aria-label={`Change stage for ${dl.title}`}
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--line)',
                                background: 'var(--panel)',
                                color: 'var(--text-2)',
                                cursor: 'pointer',
                              }}
                            >
                              {stages.map((stg) => (
                                <option key={stg.id} value={stg.id}>
                                  {stg.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-container">
            <Table headers={dealTableHeaders}>
              {deals.map((dl) => {
                const stageObj = stages.find((s) => s.id === dl.stage_id);
                const stageName = stageObj?.name || 'Lead Qualified';

                return (
                  <tr key={dl.id}>
                    {/* Title */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="td-primary" style={{ fontWeight: 700 }}>{dl.title}</span>
                        <span className="td-muted" style={{ fontSize: '11px' }}>ID: {dl.id.slice(0, 8)}</span>
                      </div>
                    </td>

                    {/* Stage */}
                    <td>
                      <span className={stageBadgeStyle(stageName)} style={{ fontWeight: 600, fontSize: '12px' }}>
                        {stageName}
                      </span>
                    </td>

                    {/* Value */}
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--success-text)', fontSize: '14px' }}>
                        ₹{dl.value.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Probability */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '64px', height: '6px', background: 'var(--panel-hover)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${dl.probability}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, var(--primary-strong), var(--primary))`,
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>
                          {dl.probability}%
                        </span>
                      </div>
                    </td>

                    {/* Close date */}
                    <td className="td-muted">
                      {dl.expected_closing_date
                        ? new Date(dl.expected_closing_date).toLocaleDateString()
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn-icon btn-icon-primary"
                          onClick={() => navigate(`/crm/deals/${dl.id}`)}
                          title="View Deal Details"
                          aria-label={`View ${dl.title}`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(dl)}
                          title="Delete Deal"
                          aria-label={`Delete ${dl.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>

            {/* Pagination */}
            <div className="table-footer">
              <span className="table-count">
                {deals.length > 0
                  ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} deals`
                  : 'No deals'}
              </span>
              <div className="pagination">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="pagination-info">Page {page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </StateViews>

      <DealFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeal(null);
        }}
        onSubmit={handleCreateOrUpdate}
        stages={stages}
        leads={leads}
        initialData={editingDeal}
        isLoading={isSubmitting}
      />
    </div>
  );
}

