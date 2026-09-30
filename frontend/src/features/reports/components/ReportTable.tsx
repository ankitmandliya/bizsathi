import React from 'react';
import { PaginatedReportTable } from '../types/report';
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface ReportTableProps {
  table?: PaginatedReportTable;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
  title?: string;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  table,
  loading,
  onPageChange,
  title = 'Detailed Report Log',
}) => {
  if (loading) {
    return (
      <div className="reports-table-card" style={{ padding: '24px' }}>
        <div style={{ opacity: 0.6 }}>
          <div style={{ height: '16px', background: 'var(--panel-alt)', width: '200px', borderRadius: '4px', marginBottom: '16px' }} />
          <div style={{ height: '40px', background: 'var(--panel-alt)', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ height: '40px', background: 'var(--panel-alt)', borderRadius: '6px', marginBottom: '8px' }} />
        </div>
      </div>
    );
  }

  const items = table?.items || [];
  const total = table?.total || 0;
  const page = table?.page || 1;
  const totalPages = table?.total_pages || 1;

  if (items.length === 0) {
    return (
      <div className="reports-table-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <FileSpreadsheet size={44} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
          No records found
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
          Try adjusting your date range or filter criteria to see results.
        </p>
      </div>
    );
  }

  const sampleColumns = items[0]?.columns || {};
  const columnKeys = Object.keys(sampleColumns);

  const formatHeader = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getStatusBadgeClass = (statusStr?: string) => {
    if (!statusStr) return 'reports-badge-info';
    const lower = statusStr.toLowerCase();
    if (lower.includes('paid') || lower.includes('won') || lower.includes('active') || lower.includes('completed') || lower.includes('in stock')) {
      return 'reports-badge-success';
    }
    if (lower.includes('pending') || lower.includes('sent') || lower.includes('draft') || lower.includes('in progress')) {
      return 'reports-badge-warning';
    }
    if (lower.includes('overdue') || lower.includes('lost') || lower.includes('low stock') || lower.includes('failed') || lower.includes('out of stock')) {
      return 'reports-badge-danger';
    }
    return 'reports-badge-info';
  };

  return (
    <div className="reports-table-card">
      {/* Table Header / Title */}
      <div className="reports-table-header">
        <div className="reports-table-title">{title}</div>
        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
          Total: <strong style={{ color: 'var(--text)' }}>{total}</strong> records
        </span>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table className="reports-table">
          <thead>
            <tr>
              {columnKeys.map((colKey) => (
                <th key={colKey}>{formatHeader(colKey)}</th>
              ))}
              {items.some((row) => row.status_badge) && (
                <th style={{ textAlign: 'right' }}>Status</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                {columnKeys.map((colKey) => {
                  const val = row.columns[colKey];
                  const isAmount =
                    colKey.toLowerCase().includes('amount') ||
                    colKey.toLowerCase().includes('total') ||
                    colKey.toLowerCase().includes('revenue') ||
                    colKey.toLowerCase().includes('cost') ||
                    colKey.toLowerCase().includes('value') ||
                    colKey.toLowerCase().includes('price');

                  return (
                    <td key={colKey}>
                      {isAmount && typeof val === 'number'
                        ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : val !== null && val !== undefined
                        ? String(val)
                        : '-'}
                    </td>
                  );
                })}

                {items.some((r) => r.status_badge) && (
                  <td style={{ textAlign: 'right', whitespace: 'nowrap' }}>
                    {row.status_badge ? (
                      <span className={`reports-badge ${getStatusBadgeClass(row.status_badge)}`}>
                        {row.status_badge}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '12px', color: 'var(--muted)', background: 'var(--panel-alt)' }}>
          <span>
            Page <strong style={{ color: 'var(--text)' }}>{page}</strong> of{' '}
            <strong style={{ color: 'var(--text)' }}>{totalPages}</strong>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="reports-btn-reset"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="reports-btn-reset"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
