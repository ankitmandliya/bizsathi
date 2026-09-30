import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Sliders, AlertCircle } from 'lucide-react';
import { Product, StockInInput, StockOutInput, StockAdjustmentInput } from '../types/inventory';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  products: Product[];
  onSubmit: (data: any) => Promise<void>;
  selectedProduct?: Product | null;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  type,
  products,
  onSubmit,
  selectedProduct,
}) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProduct = products.find((p) => p.id === productId) || selectedProduct;

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
      setUnitCost(selectedProduct.purchase_price);
      setPhysicalCount(selectedProduct.current_stock);
    } else if (products.length > 0) {
      setProductId(products[0].id);
      setUnitCost(products[0].purchase_price);
      setPhysicalCount(products[0].current_stock);
    }
    setQuantity(1);
    setReason('');
    setNotes('');
    setError(null);
  }, [selectedProduct, products, isOpen]);

  useEffect(() => {
    if (activeProduct) {
      setUnitCost(activeProduct.purchase_price);
      setPhysicalCount(activeProduct.current_stock);
    }
  }, [productId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productId) {
      setError('Please select a product');
      return;
    }

    if (type !== 'ADJUSTMENT' && quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (type === 'OUT' && activeProduct && activeProduct.current_stock < quantity) {
      setError(`Cannot dispatch ${quantity} items. Available stock is ${activeProduct.current_stock}.`);
      return;
    }

    if (type === 'ADJUSTMENT' && !reason.trim()) {
      setError('Reason for physical count adjustment is required');
      return;
    }

    setLoading(true);
    try {
      if (type === 'IN') {
        const payload: StockInInput = {
          product_id: productId,
          quantity: Number(quantity),
          unit_cost: unitCost > 0 ? Number(unitCost) : undefined,
          reason: reason.trim() || 'Stock Received',
          notes: notes.trim() || undefined,
        };
        await onSubmit(payload);
      } else if (type === 'OUT') {
        const payload: StockOutInput = {
          product_id: productId,
          quantity: Number(quantity),
          reason: reason.trim() || 'Manual Stock Out',
          notes: notes.trim() || undefined,
        };
        await onSubmit(payload);
      } else {
        const payload: StockAdjustmentInput = {
          product_id: productId,
          physical_count: Number(physicalCount),
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to record stock movement');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (type === 'IN') return 'Stock In / Purchase Receipt';
    if (type === 'OUT') return 'Stock Out / Dispatch';
    return 'Physical Stock Adjustment';
  };

  const currentStock = activeProduct ? activeProduct.current_stock : 0;
  const variance = physicalCount - currentStock;

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
          maxWidth: '520px',
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
                background: type === 'IN' ? '#dcfce7' : type === 'OUT' ? '#fef3c7' : '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: type === 'IN' ? '#15803d' : type === 'OUT' ? '#b45309' : '#4338ca',
              }}
            >
              {type === 'IN' ? <ArrowDownRight size={20} /> : type === 'OUT' ? <ArrowUpRight size={20} /> : <Sliders size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                {getTitle()}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Update product inventory balance and movement logs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '6px' }}
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              Select Product <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
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
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Current Stock: {p.current_stock} {p.unit_name || ''}
                </option>
              ))}
            </select>
          </div>

          {activeProduct && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--panel-alt)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'between',
                fontSize: '13px',
              }}
            >
              <span style={{ color: 'var(--muted)' }}>Current System Balance:</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                {activeProduct.current_stock} {activeProduct.unit_name || 'units'}
              </span>
            </div>
          )}

          {type !== 'ADJUSTMENT' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  Quantity <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
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

              {type === 'IN' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                    Unit Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
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
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  Actual Physical Count <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(parseFloat(e.target.value) || 0)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              {activeProduct && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'between',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Calculated Variance:</span>
                  <span style={{ fontWeight: 800, color: variance > 0 ? '#15803d' : variance < 0 ? '#b91c1c' : '#334155' }}>
                    {variance > 0 ? `+${variance}` : variance} {activeProduct.unit_name || ''}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              Reason / Reference {type === 'ADJUSTMENT' && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === 'IN'
                  ? 'e.g. Vendor Invoice #1029'
                  : type === 'OUT'
                  ? 'e.g. Internal Usage / Damage'
                  : 'e.g. Monthly Physical Count Audit'
              }
              required={type === 'ADJUSTMENT'}
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
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Batch number, inspector comments..."
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
                background:
                  type === 'IN'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : type === 'OUT'
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)',
              }}
            >
              {loading ? 'Processing...' : type === 'IN' ? 'Confirm Stock In' : type === 'OUT' ? 'Confirm Stock Out' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
