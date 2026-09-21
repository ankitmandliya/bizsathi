import { useCallback, useEffect, useState } from 'react';
import {
  Building2, Mail, Phone, Plus, Upload, Search, Edit2, Trash2,
  FileText, ShieldAlert, MapPin
} from 'lucide-react';
import { Table } from '../../../components/ui/Table';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StateViews } from '../../../components/common/StateViews';
import { Modal } from '../../../components/ui/Modal';
import { crmApi } from '../services/crmApi';
import { Customer } from '../types/crm';
import { CustomerModal } from '../components/CustomerModal';
import { CustomerImportModal } from '../components/CustomerImportModal';
import { CustomerStatementModal } from '../../sales/components/CustomerStatementModal';
import { getErrorMessage } from '../../../utils/error';

export function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await crmApi.getCustomers({ search: search || undefined, page, limit: 50 });
      setCustomers(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load customers'));
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await crmApi.deleteCustomer(deleteId);
      setDeleteId(null);
      loadCustomers();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete customer'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <PageHeader
          title="Customers"
          subtitle="Directory of customers, direct contacts, opening balances, and imported lists."
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <Upload size={15} /> Import Customers
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
          >
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--line)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search customer by name, mobile, email, company, or GSTIN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
          Total Customers: {total}
        </span>
      </div>

      <div className="table-container">
        <StateViews
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error && customers.length === 0}
          onRetry={loadCustomers}
          emptyTitle="No customers found"
          emptyDescription="Add a customer directly, convert leads, or import a customer file to get started."
        >
          <Table
            headers={[
              { key: 'name', title: 'Customer Name' },
              { key: 'contact', title: 'Contact' },
              { key: 'company', title: 'Company & GSTIN' },
              { key: 'location', title: 'City / State' },
              { key: 'outstanding', title: 'Outstanding Balance' },
              { key: 'credit_limit', title: 'Credit Limit' },
              { key: 'actions', title: 'Actions' },
            ]}
          >
            {customers.map((cust) => {
              const outstanding = cust.outstanding_balance ?? (
                cust.opening_balance
                  ? (cust.opening_balance_type === 'Credit' ? -cust.opening_balance : cust.opening_balance)
                  : 0
              );

              return (
                <tr key={cust.id}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {cust.name}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: cust.customer_type === 'Business' ? '#eff6ff' : '#f1f5f9', color: cust.customer_type === 'Business' ? '#2563eb' : '#475569' }}>
                          {cust.customer_type || 'Individual'}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                      {cust.phone ? (
                        <span style={{ color: 'var(--text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} color="#4f46e5" /> {cust.phone}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                      {cust.email && (
                        <span style={{ color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} /> {cust.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                      {cust.company ? (
                        <span style={{ color: 'var(--text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={12} color="var(--muted)" /> {cust.company}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                      {cust.gstin && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
                          GST: {cust.gstin}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {cust.city || cust.state ? (
                      <span style={{ fontSize: 12, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} color="var(--muted)" /> {[cust.city, cust.state].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {outstanding > 0 ? (
                        <span style={{ color: '#dc2626' }}>
                          Owes ₹{outstanding.toLocaleString()}
                        </span>
                      ) : outstanding < 0 ? (
                        <span style={{ color: '#059669' }}>
                          Credit ₹{Math.abs(outstanding).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#059669' }}>₹0</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {cust.credit_limit != null ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        ₹{cust.credit_limit.toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>No Limit</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setStatementCustomerId(cust.id)}
                        title="View Customer Statement"
                        style={{ padding: '6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel-alt)', cursor: 'pointer', color: '#4f46e5' }}
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cust)}
                        title="Edit Customer"
                        style={{ padding: '6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel-alt)', cursor: 'pointer', color: 'var(--text)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(cust.id)}
                        title="Delete Customer"
                        style={{ padding: '6px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        </StateViews>
      </div>

      {/* Customer Modal (Add / Edit) */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={loadCustomers}
        customer={selectedCustomer}
      />

      {/* Import Customers Modal */}
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadCustomers}
      />

      {/* Customer Statement Modal */}
      <CustomerStatementModal
        isOpen={!!statementCustomerId}
        onClose={() => setStatementCustomerId(null)}
        customerId={statementCustomerId}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Confirm Delete Customer"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 10 }}>
              <ShieldAlert size={24} color="#dc2626" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#991b1b' }}>Soft Delete Customer</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7f1d1d' }}>
                  This customer will be removed from lists and dropdowns, but existing invoices and payments will remain intact.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
