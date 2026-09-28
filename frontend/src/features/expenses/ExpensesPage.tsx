import React, { useEffect, useState } from 'react';
import {
  Plus,
  FolderPlus,
  Filter,
  Receipt,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Hash,
  IndianRupee,
  Search,
  X,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpenseSummaryResponse,
  expensesApi,
} from './services/expensesApi';
import { ExpensePieChart } from './ExpensePieChart';
import { ExpenseModal } from './ExpenseModal';
import { CategoriesModal } from './CategoriesModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { getErrorMessage } from '../../utils/error';
import { AuditLogButton } from '../../components/common/AuditLogButton';

type DatePreset = 'current_month' | 'previous_month' | 'current_quarter' | 'current_year' | 'custom';

function getPresetDateRange(preset: DatePreset): { from_date: string; to_date: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (preset === 'current_month') {
    const firstDay = new Date(year, month, 1);
    return {
      from_date: firstDay.toISOString().slice(0, 10),
      to_date: now.toISOString().slice(0, 10),
    };
  }

  if (preset === 'previous_month') {
    const firstDayPrev = new Date(year, month - 1, 1);
    const lastDayPrev = new Date(year, month, 0);
    return {
      from_date: firstDayPrev.toISOString().slice(0, 10),
      to_date: lastDayPrev.toISOString().slice(0, 10),
    };
  }

  if (preset === 'current_quarter') {
    const qStartMonth = Math.floor(month / 3) * 3;
    const firstDayQ = new Date(year, qStartMonth, 1);
    return {
      from_date: firstDayQ.toISOString().slice(0, 10),
      to_date: now.toISOString().slice(0, 10),
    };
  }

  if (preset === 'current_year') {
    const firstDayYear = new Date(year, 0, 1);
    return {
      from_date: firstDayYear.toISOString().slice(0, 10),
      to_date: now.toISOString().slice(0, 10),
    };
  }

  return {
    from_date: new Date(year, month, 1).toISOString().slice(0, 10),
    to_date: now.toISOString().slice(0, 10),
  };
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ExpensesPage() {
  // Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>('current_month');
  const [fromDate, setFromDate] = useState(() => getPresetDateRange('current_month').from_date);
  const [toDate, setToDate] = useState(() => getPresetDateRange('current_month').to_date);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data State
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<ExpenseSummaryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadExpensesAndSummary();
  }, [fromDate, toDate, selectedCategoryId, selectedPaymentMethod, searchQuery, page, pageSize]);

  const loadCategories = async () => {
    try {
      const cats = await expensesApi.getCategories(true);
      setCategories(cats);
    } catch (err: unknown) {
      console.error('Failed to load categories', err);
    }
  };

  const loadExpensesAndSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const filterPayload: ExpenseFilters = {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        category_id: selectedCategoryId || undefined,
        payment_method: selectedPaymentMethod || undefined,
        search: searchQuery.trim() || undefined,
        page,
        page_size: pageSize,
      };

      const [resList, resSummary] = await Promise.all([
        expensesApi.getExpenses(filterPayload),
        expensesApi.getExpenseSummary(filterPayload),
      ]);

      setExpenses(resList.items);
      setTotalExpenses(resList.total);
      setTotalPages(resList.total_pages);
      setSummary(resSummary);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load expenses'));
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getPresetDateRange(preset);
      setFromDate(range.from_date);
      setToDate(range.to_date);
    }
    setPage(1);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete expense "${expense.title}"?`)) return;

    try {
      await expensesApi.deleteExpense(expense.id);
      loadExpensesAndSummary();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete expense'));
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header & CTAs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={18} color="#fff" />
            </div>
            Office Expenses
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '14px' }}>
            Track and manage operational office expenses, categories, and distribution summaries
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <AuditLogButton entityTypes={['expense', 'expense_category']} title="Expenses Audit Log" />
          <button
            type="button"
            onClick={() => setShowCategoriesModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--line)',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <FolderPlus size={16} /> Manage Categories
          </button>

          <button
            type="button"
            onClick={() => {
              setExpenseToEdit(null);
              setShowExpenseModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
            }}
          >
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--line)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontWeight: 600, fontSize: '13px' }}>
          <Filter size={16} color="#6366f1" /> FILTERS:
        </div>

        {/* Date Range Presets */}
        <select
          value={datePreset}
          onChange={(e) => handleDatePresetChange(e.target.value as DatePreset)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
          }}
        >
          <option value="current_month">Current Month</option>
          <option value="previous_month">Previous Month</option>
          <option value="current_quarter">Current Quarter</option>
          <option value="current_year">Current Year</option>
          <option value="custom">Custom Range</option>
        </select>

        {/* Custom Range Inputs */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Category Filter */}
        <select
          value={selectedCategoryId}
          onChange={(e) => {
            setSelectedCategoryId(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: 500,
            outline: 'none',
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {!c.is_active ? '(Inactive)' : ''}
            </option>
          ))}
        </select>

        {/* Search Bar */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search
            size={15}
            color="var(--muted)"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search by title, vendor, ref no..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 30px 8px 32px',
              borderRadius: '8px',
              border: '1.5px solid var(--line)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Payment Method Filter */}
        <select
          value={selectedPaymentMethod}
          onChange={(e) => {
            setSelectedPaymentMethod(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: 500,
            outline: 'none',
          }}
        >
          <option value="">All Payment Methods</option>
          <option value="CASH">CASH</option>
          <option value="BANK">BANK TRANSFER</option>
          <option value="UPI">UPI</option>
          <option value="CARD">CARD</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Expense
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <IndianRupee size={22} color="#dc2626" />
              {(summary?.total_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Period: {fromDate} to {toDate}
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingDown size={22} color="#dc2626" />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Number of Expenses
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
              {summary?.expense_count || 0}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Filtered records count</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Hash size={22} color="#2563eb" />
          </div>
        </div>
      </div>

      {/* Category Pie Chart */}
      <ExpensePieChart breakdown={summary?.category_breakdown || []} totalExpense={summary?.total_expense || 0} />

      {/* Expense List Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--line)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Filtered Expenses</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Showing {expenses.length} of {totalExpenses} records
            </span>
          </div>

          {/* Prominent Search Bar */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search
              size={16}
              color="var(--muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search by title, vendor, ref no..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 32px 9px 36px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--panel-alt)', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', borderBottom: '1.5px solid var(--line)' }}>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>DATE</th>
              <th style={{ padding: '12px 16px' }}>CATEGORY</th>
              <th style={{ padding: '12px 16px' }}>TITLE</th>
              <th style={{ padding: '12px 16px' }}>VENDOR</th>
              <th style={{ padding: '12px 16px' }}>PAYMENT METHOD</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>AMOUNT</th>
              <th style={{ padding: '12px 16px' }}>CREATED BY</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  Loading office expenses…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
                  {error}
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  No expenses found for the selected filters.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {formatDate(exp.expense_date)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                      }}
                    >
                      {exp.category_name}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>{exp.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{exp.vendor_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {exp.payment_method}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                      <IndianRupee size={14} />
                      {exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>
                    {exp.created_by_name || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExpense(exp);
                          setShowDetailModal(true);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px' }}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseToEdit(exp);
                          setShowExpenseModal(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '2px' }}
                        title="Edit Expense"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        title="Delete Expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--panel-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>

            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Showing {totalExpenses === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalExpenses)} of {totalExpenses} records
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={() => {
          loadExpensesAndSummary();
          loadCategories();
        }}
        expenseToEdit={expenseToEdit}
        categories={categories}
      />

      <CategoriesModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        categories={categories}
        onRefresh={() => {
          loadCategories();
          loadExpensesAndSummary();
        }}
      />

      <ExpenseDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        expense={selectedExpense}
      />
    </div>
  );
}
