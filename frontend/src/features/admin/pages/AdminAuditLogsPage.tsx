import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldAlert, Filter } from 'lucide-react';
import { adminApi, type AuditLogItem, type BusinessListItem } from '../../../services/api/adminApi';
import { AdminPagination } from '../components/AdminPagination';

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Load business dropdown options
  useEffect(() => {
    adminApi
      .getBusinesses({ page_size: 100 })
      .then((res) => setBusinesses(res.items))
      .catch(() => {
        /* silent */
      });
  }, []);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    adminApi
      .getAuditLogs({
        page,
        page_size: pageSize,
        tenant_id: selectedTenantId || undefined,
        action: actionFilter || undefined,
        search: search || undefined,
      })
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch audit logs:', err);
        setLoading(false);
      });
  }, [page, pageSize, selectedTenantId, actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', color: '#818cf8' }}>
              <ShieldAlert size={22} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Platform Audit Logs
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Cross-tenant audit trail of administrative actions, security events, and system mutations
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--card-bg, #1e293b)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: 1,
            minWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg, #0f172a)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #334155)',
          }}
        >
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            placeholder="Search actor name, action, or entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text)',
              width: '100%',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Action Filter Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg, #0f172a)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #334155)',
          }}
        >
          <Filter size={14} color="var(--muted)" />
          <input
            type="text"
            placeholder="Filter action (e.g. tenant.create)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '13px',
              width: '200px',
            }}
          />
        </div>

        {/* Business Selector Dropdown */}
        <select
          value={selectedTenantId}
          onChange={(e) => {
            setSelectedTenantId(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #334155)',
            background: 'var(--bg, #0f172a)',
            color: 'var(--text)',
            fontSize: '13px',
            outline: 'none',
            fontWeight: 500,
          }}
        >
          <option value="">All Businesses (Cross-Tenant)</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Logs Table Container */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            Loading platform audit logs…
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <ShieldAlert size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No audit log entries found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {search || selectedTenantId || actionFilter
                ? 'Try adjusting your search criteria or tenant filter'
                : 'System action audit records will be listed here.'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg, #0f172a)', borderBottom: '1px solid var(--border-color, #334155)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Actor</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Action</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Entity</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color, #334155)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                    {log.actor_name || 'System'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        background: log.action.includes('suspend') || log.action.includes('delete')
                          ? 'rgba(239, 68, 68, 0.15)'
                          : log.action.includes('create') || log.action.includes('override')
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: log.action.includes('suspend') || log.action.includes('delete')
                          ? '#ef4444'
                          : log.action.includes('create') || log.action.includes('override')
                          ? '#818cf8'
                          : 'var(--text)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px' }}>{log.entity_type}: </span>
                    <span>{log.entity_label || log.entity_id || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: '12px' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Server-Side Admin Pagination */}
        {!loading && total > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color, #334155)', background: 'var(--bg, #0f172a)' }}>
            <AdminPagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

