import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function AdminPagination({
  currentPage,
  totalPages: propTotalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: AdminPaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = propTotalPages ?? (Math.ceil(totalItems / pageSize) || 1);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers range
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'var(--card-bg, #1e293b)',
        borderTop: '1px solid var(--border-color, #334155)',
        borderRadius: '0 0 12px 12px',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      {/* Items Range Summary */}
      <div style={{ fontSize: '13px', color: 'var(--muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>
          Showing <strong style={{ color: 'var(--text, #f8fafc)' }}>{startItem}</strong> to{' '}
          <strong style={{ color: 'var(--text, #f8fafc)' }}>{endItem}</strong> of{' '}
          <strong style={{ color: 'var(--text, #f8fafc)' }}>{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <span style={{ fontSize: '12px' }}>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                background: 'var(--input-bg, #0f172a)',
                color: 'var(--text, #f8fafc)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '12px' }}>per page</span>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #334155)',
            background: currentPage <= 1 ? 'transparent' : 'var(--input-bg, #0f172a)',
            color: currentPage <= 1 ? 'var(--muted, #64748b)' : 'var(--text, #f8fafc)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--muted, #64748b)', fontSize: '13px' }}>
                ...
              </span>
            );
          }
          const isSelected = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(Number(p))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-color, #334155)',
                background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'var(--input-bg, #0f172a)',
                color: isSelected ? '#ffffff' : 'var(--text, #f8fafc)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #334155)',
            background: currentPage >= totalPages ? 'transparent' : 'var(--input-bg, #0f172a)',
            color: currentPage >= totalPages ? 'var(--muted, #64748b)' : 'var(--text, #f8fafc)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
