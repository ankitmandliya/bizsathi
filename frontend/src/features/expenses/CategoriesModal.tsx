import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ExpenseCategory, expensesApi } from './services/expensesApi';
import { getErrorMessage } from '../../utils/error';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onRefresh: () => void;
}

export function CategoriesModal({ isOpen, onClose, categories, onRefresh }: CategoriesModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingCatId(null);
    setName('');
    setDescription('');
    setShowAddForm(true);
    setError(null);
  };

  const handleStartEdit = (cat: ExpenseCategory) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setShowAddForm(true);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCatId) {
        await expensesApi.updateCategory(editingCatId, {
          name: name.trim(),
          description: description.trim() || null,
        });
      } else {
        await expensesApi.createCategory({
          name: name.trim(),
          description: description.trim() || null,
        });
      }
      setShowAddForm(false);
      setName('');
      setDescription('');
      setEditingCatId(null);
      onRefresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save category'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    try {
      await expensesApi.updateCategory(cat.id, {
        is_active: !cat.is_active,
      });
      onRefresh();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to toggle category status'));
    }
  };

  const handleDelete = async (cat: ExpenseCategory) => {
    if (
      !confirm(
        `Are you sure you want to delete/deactivate "${cat.name}"? If expenses reference this category, it will be deactivated to protect historical data.`
      )
    ) {
      return;
    }

    try {
      await expensesApi.deleteCategory(cat.id);
      onRefresh();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Manage Expense Categories</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Top CTAs */}
          {!showAddForm && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={handleStartAdd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <form
              onSubmit={handleSave}
              style={{
                background: 'var(--panel-alt)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>
                {editingCatId ? 'Edit Category' : 'Create New Category'}
              </h3>

              {error && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    color: '#991b1b',
                    fontSize: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  CATEGORY NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Supplies"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    background: 'none',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Saving...' : editingCatId ? 'Update' : 'Create Category'}
                </button>
              </div>
            </form>
          )}

          {/* Categories Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontSize: '11px' }}>
                <th style={{ padding: '10px' }}>CATEGORY NAME</th>
                <th style={{ padding: '10px' }}>DESCRIPTION</th>
                <th style={{ padding: '10px' }}>STATUS</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text)' }}>{cat.name}</td>
                  <td style={{ padding: '10px', color: 'var(--muted)' }}>{cat.description || '—'}</td>
                  <td style={{ padding: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: cat.is_active ? '#f0fdf4' : '#fef2f2',
                        color: cat.is_active ? '#166534' : '#991b1b',
                      }}
                    >
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '2px' }}
                        title="Edit category"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        title="Delete or deactivate category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
