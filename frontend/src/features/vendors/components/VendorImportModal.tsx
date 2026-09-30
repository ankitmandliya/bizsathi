import React, { useState } from 'react';
import { Download, FileText, Upload, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { vendorApi } from '../services/vendorApi';
import { VendorImportSummaryResponse } from '../types/vendor';

interface VendorImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VendorImportModal: React.FC<VendorImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<VendorImportSummaryResponse | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      await vendorApi.downloadImportTemplate();
    } catch (err) {
      console.error('Failed to download template:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSummary(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file to import.');
      return;
    }

    setLoading(true);
    setError('');
    setSummary(null);

    try {
      const res = await vendorApi.importVendors(file);
      setSummary(res);
      if (res.imported > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(errorObj.response?.data?.detail || errorObj.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSummary(null);
    setError('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
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
            background: 'var(--panel-alt)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Upload size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Import Vendors CSV
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Bulk import supplier records with phone number deduplication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {/* Download Template Step */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--panel-alt)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                1. Download Sample CSV Template
              </p>
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Includes required headers: Vendor Name *, Phone *
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={14} /> Template
            </button>
          </div>

          {/* Upload Drop Zone */}
          {!summary ? (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                2. Select CSV File to Upload
              </label>
              <div
                style={{
                  border: '2px dashed var(--line)',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('vendor-file-input')?.click()}
              >
                <FileText size={32} color="#4338ca" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {file ? file.name : 'Click to select CSV file'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .csv files with header row'}
                </p>
                <input
                  id="vendor-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ) : (
            /* Results Summary */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <CheckCircle2 size={24} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>Import Completed</h4>
                  <p style={{ fontSize: '12px', margin: '2px 0 0', opacity: 0.9 }}>
                    Processed {summary.total_rows} rows from file.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                <div style={{ padding: '12px', background: 'var(--panel-alt)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Imported</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {summary.imported}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--panel-alt)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Skipped (Duplicates)</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                    {summary.skipped_duplicates}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--panel-alt)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Failed</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                    {summary.failed}
                  </div>
                </div>
              </div>

              {summary.errors && summary.errors.length > 0 && (
                <div style={{ border: '1px solid #fecaca', borderRadius: '10px', padding: '14px', background: '#fff5f5' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Failed Row Details ({summary.errors.length})
                  </h5>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#991b1b' }}>
                    {summary.errors.map((err, idx) => (
                      <div key={idx}>
                        Row {err.row_number}: {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {summary ? 'Close' : 'Cancel'}
            </button>

            {!summary ? (
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: !file || loading ? 'not-allowed' : 'pointer',
                  opacity: !file || loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Processing...' : 'Upload & Import'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} /> Import Another File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
