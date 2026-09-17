import type { ReactNode } from 'react';

type Column<T> = {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
};

type HeaderItem = {
  key: string;
  title: string;
};

type TableProps<T> = {
  data?: T[];
  columns?: Column<T>[];
  headers?: HeaderItem[];
  children?: ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
};

export function Table<T extends { id?: string | number }>({
  data,
  columns,
  headers,
  children,
  emptyMessage = 'No data available',
  isLoading = false,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="state-view">
        <div className="spinner" />
        <p style={{ color: 'var(--muted-2)', fontSize: '13px' }}>Loading…</p>
      </div>
    );
  }

  // Children + headers mode (manual rows)
  if (headers && children) {
    return (
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h.key}>{h.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="state-view">
        <p style={{ color: 'var(--muted-2)', fontSize: '13px' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns?.map((col, idx) => (
              <th key={idx}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr key={item.id ?? rowIdx}>
              {columns?.map((col, colIdx) => (
                <td key={colIdx}>
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                      ? String(item[col.accessorKey] ?? '')
                      : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
