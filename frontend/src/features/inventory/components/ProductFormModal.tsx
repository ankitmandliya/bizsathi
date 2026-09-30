import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { ProductCategory, ProductCreateInput, ProductUpdateInput, Unit } from '../types/inventory';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductCreateInput | ProductUpdateInput) => Promise<void>;
  initialData?: any;
  categories: ProductCategory[];
  units: Unit[];
  isEdit?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  units,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_id: '',
    description: '',
    purchase_price: 0,
    selling_price: 0,
    minimum_stock: 5,
    opening_stock: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        sku: initialData.sku || '',
        category_id: initialData.category_id || '',
        unit_id: initialData.unit_id || '',
        description: initialData.description || '',
        purchase_price: initialData.purchase_price || 0,
        selling_price: initialData.selling_price || 0,
        minimum_stock: initialData.minimum_stock ?? 5,
        opening_stock: 0,
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        category_id: '',
        unit_id: units[0]?.id || '',
        description: '',
        purchase_price: 0,
        selling_price: 0,
        minimum_stock: 5,
        opening_stock: 0,
      });
    }
    setError(null);
  }, [initialData, isOpen, units]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.sku.trim()) {
      setError('SKU is required');
      return;
    }
    if (!formData.unit_id) {
      setError('Unit of measurement is required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        unit_id: formData.unit_id,
        category_id: formData.category_id || null,
        description: formData.description.trim() || null,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        minimum_stock: Number(formData.minimum_stock),
      };

      if (!isEdit && formData.opening_stock > 0) {
        payload.opening_stock = Number(formData.opening_stock);
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1.5px solid var(--line)',
          overflow: 'hidden',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            background: 'var(--panel-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                {isEdit ? 'Update product parameters and prices' : 'Create catalog product with stock controls'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Product Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Wireless Ergonomic Mouse"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                SKU / Code <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. MOUSE-001"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="">-- No Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Unit of Measure <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_name || u.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Selling Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Minimum Stock Level
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Initial Opening Stock Quantity
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.opening_stock}
                onChange={(e) => setFormData({ ...formData, opening_stock: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Creates an automatic OPENING stock movement record upon creation.
              </p>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specifications, supplier details, warranty terms..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1.5px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
              }}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
