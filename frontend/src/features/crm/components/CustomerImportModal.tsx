import React, { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { crmApi } from '../services/crmApi';
import { CustomerImportSummary } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerImportModal({ isOpen, onClose, onSuccess }: CustomerImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CustomerImportSummary | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setSummary(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setError(null);
      const blob = await crmApi.downloadCustomerTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customer_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to download sample template.'));
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await crmApi.importCustomers(selectedFile);
      setSummary(res);
      if (res.imported_count > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to import customer file.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSummary(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Import Customers from File"
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Instructions & Template Box */}
        <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>Upload Excel or CSV Customer List</h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Upload a CSV file containing your customer records. <strong>Customer Name</strong> and <strong>Mobile Number</strong> are required per row.
            Duplicate mobile numbers will be skipped automatically.
          </p>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <Download size={14} color="#4f46e5" /> Download Sample Template (.csv)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Upload Form */}
        {!summary ? (
          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Select File (.csv)</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px dashed var(--line)', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
              />
              {selectedFile && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: isUploading || !selectedFile ? 0.6 : 1 }}
              >
                <Upload size={16} />
                {isUploading ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </form>
        ) : (
          /* Import Summary Results View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <CheckCircle size={20} color="#16a34a" style={{ margin: '0 auto 4px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#166534' }}>{summary.imported_count}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#15803d', fontWeight: 600 }}>Imported</p>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <AlertTriangle size={20} color="#d97706" style={{ margin: '0 auto 4px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#92400e' }}>{summary.skipped_count}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#b45309', fontWeight: 600 }}>Skipped (Duplicates)</p>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <AlertCircle size={20} color="#dc2626" style={{ margin: '0 auto 4px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#991b1b' }}>{summary.failed_count}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>Failed Rows</p>
              </div>
            </div>

            {/* Error Details Table */}
            {summary.errors && summary.errors.length > 0 && (
              <div style={{ background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', padding: 14 }}>
                <h5 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Row Error Details</h5>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#7f1d1d' }}>
                  {summary.errors.map((err, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      <strong>Row {err.row}:</strong> {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={handleReset}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Upload Another File
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
