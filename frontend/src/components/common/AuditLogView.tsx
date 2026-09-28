import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, ChevronRight, Filter, RefreshCw, Shield } from 'lucide-react';
import { fetchAuditLogs, type AuditLogItem } from '../../services/api/auditLogsApi';

interface AuditLogViewProps {
  entityTypes?: string[];
  entityId?: string;
  showEntityFilter?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  'crm.lead.create': 'created Lead',
  'crm.lead.update': 'updated Lead',
  'crm.lead.delete': 'deleted Lead',
  'crm.lead.convert': 'converted Lead to Customer',
  'crm.deal.create': 'created Deal',
  'crm.deal.update': 'updated Deal',
  'crm.deal.stage_change': 'changed Deal stage',
  'crm.deal.delete': 'deleted Deal',
  'crm.activity.create': 'created Activity',
  'crm.activity.update': 'updated Activity',
  'crm.activity.complete': 'completed Activity',
  'crm.customer.create': 'created Customer',
  'crm.customer.update': 'updated Customer',
  'crm.customer.delete': 'deleted Customer',
  'crm.customer.import': 'imported Customer batch',
  'sales.quotation.create': 'created Quotation',
  'sales.quotation.update': 'updated Quotation',
  'sales.quotation.delete': 'deleted Quotation',
  'sales.quotation.convert': 'converted Quotation to Invoice',
  'sales.invoice.create': 'created Invoice',
  'sales.invoice.delete': 'deleted Invoice',
  'sales.payment.create': 'recorded Payment',
  'expense.create': 'created Expense',
  'expense.update': 'updated Expense',
  'expense.delete': 'deleted Expense',
  'expense.category.create': 'created Expense Category',
  'expense.category.update': 'updated Expense Category',
  'expense.category.delete': 'deleted Expense Category',
  'expense.category.deactivate': 'deactivated Expense Category',
  'user.login': 'logged in',
  'user.login_failed': 'failed login attempt',
  'user.logout': 'logged out',
  'user.password_change': 'changed password',
  'user.create': 'created User',
  'user.update': 'updated User',
  'user.setup_login': 'set up employee login credentials',
  'tenant.settings.update_channels': 'updated Business Settings',
  'marketing.template.create': 'created Marketing Template',
  'marketing.template.update': 'updated Marketing Template',
  'marketing.template.submit_approval': 'submitted Marketing Template for approval',
  'marketing.campaign.create': 'created Campaign',
  'create': 'created record',
  'update': 'updated record',
  'delete': 'deleted record',
  'setup_login': 'set up login',
};

function formatAction(action: string): string {
  if (ACTION_LABELS[action]) {
    return ACTION_LABELS[action];
  }
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(val: any): string {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  entityTypes,
  entityId,
  showEntityFilter = false,
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Filter states
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const loadLogs = useCallback(
    async (targetPage: number, append = false) => {
      setLoading(true);
      setError(null);
      try {
        let entityTypeParam: string | undefined = undefined;
        if (selectedEntityType) {
          entityTypeParam = selectedEntityType;
        } else if (entityTypes && entityTypes.length > 0) {
          entityTypeParam = entityTypes.join(',');
        }

        const res = await fetchAuditLogs({
          entity_type: entityTypeParam,
          entity_id: entityId,
          action: actionFilter || undefined,
          date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
          date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
          page: targetPage,
          page_size: 20,
        });

        if (append) {
          setLogs((prev) => [...prev, ...res.items]);
        } else {
          setLogs(res.items);
        }
        setPage(res.page);
        setTotalPages(res.total_pages);
        setTotalCount(res.total);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('Access Denied: You require audit.view permissions to view Audit Logs.');
        } else {
          setError('Failed to load audit logs. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [entityTypes, entityId, selectedEntityType, actionFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    setPage(1);
    loadLogs(1, false);
  }, [loadLogs]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 8,
    border: '1.5px solid var(--line)',
    background: 'var(--bg-card)',
    color: 'var(--text)',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--muted)',
    marginBottom: 4,
  };

  return (
    <div className="audit-log-view-container">
      {/* Filter Toolbar */}
      <div className="audit-log-filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: showEntityFilter ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10 }}>
          {showEntityFilter && (
            <div>
              <label style={labelStyle}>Module / Section</label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                style={inputStyle}
              >
                <option value="">All Modules</option>
                <option value="lead">Leads</option>
                <option value="deal">Deals</option>
                <option value="customer">Customers</option>
                <option value="quotation">Quotations</option>
                <option value="invoice">Invoices</option>
                <option value="payment">Payments</option>
                <option value="employee">Employees</option>
                <option value="attendance">Attendance</option>
                <option value="leave">Leaves</option>
                <option value="salary_advance">Salary Advances</option>
                <option value="payroll">Payroll</option>
                <option value="expense">Expenses</option>
                <option value="tenant">Settings</option>
                <option value="campaign">Marketing Campaigns</option>
                <option value="template">Marketing Templates</option>
                <option value="user">User Auth & Logins</option>
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => loadLogs(1, false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--primary)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={13} />
              <span>Apply Filters</span>
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
              Showing {logs.length} of {totalCount} events
            </span>
          </div>
          {(dateFrom || dateTo || actionFilter || selectedEntityType) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setActionFilter('');
                setSelectedEntityType('');
                setTimeout(() => loadLogs(1, false), 0);
              }}
              style={{
                fontSize: 12,
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="audit-log-timeline">
        {error && (
          <div style={{ padding: 14, background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger-text)', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <Clock size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>No audit entries found.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Audit log entries will appear here as system actions occur.</p>
          </div>
        )}

        <div className="audit-log-timeline-track">
          {logs.map((log) => {
            const isExpanded = expandedItems[log.id];
            const hasChanges = log.changes && Object.keys(log.changes).length > 0;

            return (
              <div key={log.id} className="audit-log-card">
                <div className="audit-log-node" />

                {/* Event Main Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {log.actor_name || 'System / Anonymous'}
                      </span>{' '}
                      {formatAction(log.action)}{' '}
                      {log.entity_label && (
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                          "{log.entity_label}"
                        </span>
                      )}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                      <span>{formatDate(log.created_at)}</span>
                      {log.ip_address && <span>• IP {log.ip_address}</span>}
                      {log.entity_type && (
                        <span style={{ padding: '2px 6px', background: 'var(--panel-alt)', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-2)' }}>
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasChanges && (
                    <button
                      onClick={() => toggleExpand(log.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--primary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 8,
                      }}
                    >
                      <span>{isExpanded ? 'Hide diff' : 'What changed'}</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>

                {/* Expandable Changes Diff Table */}
                {hasChanges && isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <table className="audit-diff-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Old Value</th>
                          <th>New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(log.changes || {}).map(([key, diff]) => (
                          <tr key={key}>
                            <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {formatFieldName(key)}
                            </td>
                            <td>
                              <span className="audit-diff-old">{renderValue(diff.old)}</span>
                            </td>
                            <td>
                              <span className="audit-diff-new">{renderValue(diff.new)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--primary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>

      {/* Footer with Load More */}
      {page < totalPages && (
        <div style={{ padding: 14, borderTop: '1px solid var(--line)', background: 'var(--panel-alt)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => loadLogs(page + 1, true)}
            disabled={loading}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1.5px solid var(--line)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Loading...' : 'Load More History'}
          </button>
        </div>
      )}
    </div>
  );
};
