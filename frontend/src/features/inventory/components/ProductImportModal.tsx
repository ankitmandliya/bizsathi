import React, { useState } from 'react';
import { X, Upload, Download, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    total_rows: number;
    imported: number;
    skipped_duplicates: number;
    failed: number;
    errors: Array<{ row_number: number; product_name?: string; sku?: string; reason: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      await inventoryApi.downloadImportTemplate();
    } catch (err: any) {
      alert('Failed to download sample import template.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSummary(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.importProducts(file);
      setSummary(res);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import products file.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setSummary(null);
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          maxWidth: '560px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Bulk Import Products
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Upload a CSV spreadsheet to import products in bulk
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {!summary ? (
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Download Template Banner */}
            <div
              style={{
                background: 'var(--panel-alt)',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#4f46e5" />
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    Sample CSV Template
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    Includes pre-formatted column headers & example row
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#e0e7ff',
                  border: '1px solid #c7d2fe',
                  color: '#4338ca',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <Download size={14} /> Download Template
              </button>
            </div>

            {/* File Upload Box */}
            <div
              style={{
                position: 'relative',
                border: '2px dashed var(--line)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                cursor: 'pointer',
              }}
            >

              <Upload size={32} color="#4f46e5" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {file ? file.name : 'Click or drag CSV file here to upload'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0' }}>
                Supports CSV files with columns: Product Name *, SKU, Category, Unit *, Prices & Stock
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#b91c1c',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: 'var(--panel-alt)',
                  border: '1px solid var(--line)',
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
                disabled={loading || !file}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: loading || !file ? 'not-allowed' : 'pointer',
                  opacity: loading || !file ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {loading ? 'Processing Import...' : 'Import Products'}
              </button>
            </div>
          </form>
        ) : (
          /* Import Result Summary */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={28} color="#047857" />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#047857' }}>
                  Import Completed Successfully
                </h4>
                <p style={{ fontSize: '12px', color: '#065f46', margin: '2px 0 0' }}>
                  Processed {summary.total_rows} total rows in your CSV file.
                </p>
              </div>
            </div>

            {/* Stat Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: 'var(--panel-alt)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#16a34a' }}>{summary.imported}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>Products Imported</p>
              </div>
              <div style={{ background: 'var(--panel-alt)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#d97706' }}>{summary.skipped_duplicates}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>Duplicates Skipped</p>
              </div>
              <div style={{ background: 'var(--panel-alt)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: summary.failed > 0 ? '#dc2626' : 'var(--muted)' }}>
                  {summary.failed}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>Failed Rows</p>
              </div>
            </div>

            {/* Error List */}
            {summary.errors && summary.errors.length > 0 && (
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> Import Errors ({summary.errors.length}):
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--muted)' }}>
                  {summary.errors.map((err, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      Row {err.row_number}: {err.product_name || err.sku || 'Item'} -{err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
