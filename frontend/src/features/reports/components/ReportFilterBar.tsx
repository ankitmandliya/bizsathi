import React from 'react';
import { PresetFilter, ReportCategory, ReportFilterParams } from '../types/report';
import {
  Download,
  RotateCcw,
  Calendar,
  Filter,
  DollarSign,
  Receipt,
  Users,
  ShoppingBag,
  Package,
  Briefcase,
  Target,
  Megaphone,
} from 'lucide-react';

interface ReportFilterBarProps {
  activeCategory: ReportCategory;
  onCategoryChange: (cat: ReportCategory) => void;
  filters: ReportFilterParams;
  onFilterChange: (newFilters: Partial<ReportFilterParams>) => void;
  onReset: () => void;
  onExport: () => void;
  exporting?: boolean;
}

const CATEGORIES: { id: ReportCategory; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'sales', label: 'Sales & Invoices', icon: DollarSign },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'vendors', label: 'Vendors', icon: ShoppingBag },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'hrm', label: 'HRM & Payroll', icon: Briefcase },
  { id: 'crm', label: 'CRM & Pipeline', icon: Target },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
];

const PRESETS: { id: PresetFilter; label: string }[] = [
  { id: 'current_month', label: 'Current Month' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'quarter_to_date', label: 'Quarter to Date' },
  { id: 'year_to_date', label: 'Year to Date' },
  { id: 'custom', label: 'Custom Range' },
];

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  activeCategory,
  onCategoryChange,
  filters,
  onFilterChange,
  onReset,
  onExport,
  exporting,
}) => {
  return (
    <div className="reports-filter-panel">
      {/* Category Selection Navigation */}
      <div className="reports-cat-nav">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`reports-cat-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Controls Row */}
      <div className="reports-controls-bar">
        <div className="reports-control-group">
          {/* Date Preset Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--muted)' }} />
            <select
              value={filters.preset || 'current_month'}
              onChange={(e) => onFilterChange({ preset: e.target.value as PresetFilter })}
              className="reports-select"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs */}
          {filters.preset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--panel-alt)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => onFilterChange({ start_date: e.target.value })}
                className="reports-input"
                style={{ padding: '4px 6px', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>to</span>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => onFilterChange({ end_date: e.target.value })}
                className="reports-input"
                style={{ padding: '4px 6px', fontSize: '12px' }}
              />
            </div>
          )}

          {/* Category-Specific Filters */}
          {activeCategory === 'sales' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: 'var(--muted)' }} />
              <select
                value={filters.status || ''}
                onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
                className="reports-select"
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Sent">Sent / Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          )}

          {activeCategory === 'expenses' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Filter by Category..."
                value={filters.category || ''}
                onChange={(e) => onFilterChange({ category: e.target.value || undefined })}
                className="reports-input"
                style={{ width: '150px' }}
              />
            </div>
          )}

          {activeCategory === 'inventory' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.low_stock_only || false}
                onChange={(e) => onFilterChange({ low_stock_only: e.target.checked })}
              />
              Low Stock Only
            </label>
          )}

          {/* Reset Filters */}
          <button onClick={onReset} title="Reset Filters" className="reports-btn-reset">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Action Button: Export CSV */}
        <button onClick={onExport} disabled={exporting} className="reports-btn-export">
          <Download size={15} />
          <span>{exporting ? 'Exporting CSV...' : 'Export CSV'}</span>
        </button>
      </div>
    </div>
  );
};
