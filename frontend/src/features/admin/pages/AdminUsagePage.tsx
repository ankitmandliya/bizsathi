import { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Users,
  Briefcase,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { adminApi, type TenantUsageItem } from '../../../services/api/adminApi';

export function AdminUsagePage() {
  const [items, setItems] = useState<TenantUsageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(15);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('user_count');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getUsage({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        sort_by: sortBy,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch((err) => {
        console.error('Failed to load usage data:', err);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', color: '#38bdf8' }}>
              <Activity size={22} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Tenant Usage & Metering Overview
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Monitor active user seats, customer counts, employees, and monthly invoices across all tenant businesses
          </p>
        </div>
      </div>

      {/* Search & Sorting Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--card-bg, #1e293b)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search business name or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'var(--bg, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            <Filter size={15} />
            <span>Sort by:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 14px',
              background: 'var(--bg, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="user_count">User Seats (Highest first)</option>
            <option value="customer_count">Customers (Highest first)</option>
            <option value="employee_count">Employees (Highest first)</option>
            <option value="invoices_this_month">Invoices This Month (Highest first)</option>
          </select>
        </div>
      </div>

      {/* Usage Table */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #334155)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-color, #334155)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  Business Name
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  Plan
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  Active Users (Seats)
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  Customers
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  Employees
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  Invoices This Month
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    Loading tenant usage metrics...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No tenant businesses found matching filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLimitSet = item.user_limit !== null && item.user_limit !== undefined;
                  const pct = isLimitSet ? Math.min(100, Math.round((item.user_count / (item.user_limit || 1)) * 100)) : 0;
                  const isNearLimit = isLimitSet && item.user_count >= (item.user_limit || 1);

                  return (
                    <tr
                      key={item.tenant_id}
                      style={{ borderBottom: '1px solid var(--border-color, #334155)', transition: 'background 0.2s' }}
                    >
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text)' }}>
                        <div>{item.business_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>{item.slug}</div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: item.plan_slug === 'growth' || item.plan_slug === 'legacy' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: item.plan_slug === 'growth' || item.plan_slug === 'legacy' ? '#c084fc' : '#38bdf8',
                            border: `1px solid ${item.plan_slug === 'growth' || item.plan_slug === 'legacy' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                          }}
                        >
                          {item.plan_name}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: isNearLimit ? '#f87171' : 'var(--text)' }}>
                            <span>
                              {item.user_count} {isLimitSet ? `/ ${item.user_limit}` : 'users'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {isLimitSet ? `${pct}%` : 'Unlimited'}
                            </span>
                          </div>

                          {isLimitSet && (
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: isNearLimit ? '#f87171' : '#38bdf8',
                                  borderRadius: '3px',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 600 }}>
                          <Users size={15} style={{ color: '#34d399' }} />
                          <span>{item.customer_count}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 600 }}>
                          <Briefcase size={15} style={{ color: '#a78bfa' }} />
                          <span>{item.employee_count}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 600 }}>
                          <FileText size={15} style={{ color: '#fbbf24' }} />
                          <span>{item.invoices_this_month}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderTop: '1px solid var(--border-color, #334155)',
            fontSize: '13px',
            color: 'var(--muted)',
          }}
        >
          <div>
            Showing {total > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(total, page * pageSize)} of {total} tenants
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                background: 'var(--bg, #0f172a)',
                border: '1px solid var(--border-color, #334155)',
                color: page <= 1 ? 'var(--muted)' : 'var(--text)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: 'var(--bg, #0f172a)',
                border: '1px solid var(--border-color, #334155)',
                color: page >= totalPages ? 'var(--muted)' : 'var(--text)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
