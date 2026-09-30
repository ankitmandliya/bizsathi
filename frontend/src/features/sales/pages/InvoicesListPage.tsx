import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, Eye, FileText, IndianRupee, MessageCircle, Plus, Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Invoice, salesApi } from '../services/salesApi';
import { crmApi, Customer } from '../../crm/services/crmApi';
import { InvoiceModal } from '../components/InvoiceModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { CustomerStatementModal } from '../components/CustomerStatementModal';
import { getErrorMessage } from '../../../utils/error';
import { getAccessToken } from '../../../services/auth/tokens';
import { AuditLogButton } from '../../../components/common/AuditLogButton';

export function InvoicesListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'partially_paid'>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedCustomerIdForStatement, setSelectedCustomerIdForStatement] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, custRes] = await Promise.all([
        salesApi.getInvoices(),
        crmApi.getCustomers(),
      ]);

      const custList = Array.isArray(custRes) ? custRes : custRes.items || [];
      const map: Record<string, Customer> = {};
      custList.forEach((c) => {
        map[c.id] = c;
      });
      setCustomersMap(map);
      setInvoices(invRes.items);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch invoices.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPI summary calculations
  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + (inv.status !== 'Cancelled' ? inv.total_amount : 0),
    0
  );
  const amountReceived = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);

  const pendingAmount = invoices.reduce((sum, inv) => {
    const isOverdue =
      inv.status === 'Overdue' || (inv.amount_due > 0 && new Date(inv.due_date) < new Date());
    return sum + (!isOverdue && inv.status !== 'Cancelled' ? inv.amount_due : 0);
  }, 0);

  const overdueAmount = invoices.reduce((sum, inv) => {
    const isOverdue =
      inv.status === 'Overdue' || (inv.amount_due > 0 && new Date(inv.due_date) < new Date());
    return sum + (isOverdue && inv.status !== 'Cancelled' ? inv.amount_due : 0);
  }, 0);

  // Filter logic (Search, Tabs, Date Range)
  const filteredInvoices = invoices.filter((inv) => {
    const customer = customersMap[inv.customer_id];
    const isOverdue =
      inv.status === 'Overdue' || (inv.amount_due > 0 && new Date(inv.due_date) < new Date());

    let tabMatch = true;
    if (activeTab === 'paid') tabMatch = inv.status === 'Paid';
    else if (activeTab === 'pending') tabMatch = (inv.status === 'Sent' || inv.status === 'Pending' || inv.status === 'Draft') && !isOverdue;
    else if (activeTab === 'overdue') tabMatch = isOverdue;
    else if (activeTab === 'partially_paid') tabMatch = inv.status === 'Partially Paid';

    let searchMatch = true;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const invNo = inv.invoice_number.toLowerCase();
      const custName = (customer?.name || '').toLowerCase();
      const company = (customer?.company || '').toLowerCase();
      const gstin = (customer?.gstin || '').toLowerCase();
      searchMatch = invNo.includes(q) || custName.includes(q) || company.includes(q) || gstin.includes(q);
    }

    let dateMatch = true;
    const invDate = new Date(inv.issue_date);
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      dateMatch = dateMatch && invDate >= sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      dateMatch = dateMatch && invDate <= eDate;
    }

    return tabMatch && searchMatch && dateMatch;
  });

  // Action: WhatsApp share with PDF link and clean formatting
  const handleSendWhatsApp = (inv: Invoice) => {
    const customer = customersMap[inv.customer_id];
    const phone = customer?.phone ? customer.phone.trim().replace(/[^0-9]/g, '') : '';
    if (!phone) {
      alert(`Customer mobile number not found for "${customer?.name || 'Customer'}". Please add phone number in Customer section.`);
      return;
    }

    const token = getAccessToken();
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const pdfUrl = `${backendUrl}/api/v1/sales/invoices/${inv.id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
    const customerName = customer?.name || customer?.company || 'Valued Customer';
    const dueDateStr = new Date(inv.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const issueDateStr = new Date(inv.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const businessName = localStorage.getItem('bizsathi.business_name') || 'BizSathi';
    const message = `Hello *${customerName}*,\n\nHere is your Sales Invoice & Statement summary from ${businessName}:\n\n*Invoice No:* ${inv.invoice_number}\n*Invoice Date:* ${issueDateStr}\n*Due Date:* ${dueDateStr}\n\n*Total Amount:* ₹${inv.total_amount.toLocaleString('en-IN')}\n*Amount Paid:* ₹${inv.amount_paid.toLocaleString('en-IN')}\n*Remaining Due:* ₹${inv.amount_due.toLocaleString('en-IN')}\n\n*Download PDF Statement:* ${pdfUrl}\n\nPlease let us know if you need any assistance.\nThank you!`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Action: Automatic PDF Print / Download with Auth Token
  const handleDownloadPdf = (invoiceId: string) => {
    const token = getAccessToken();
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const pdfUrl = `${backendUrl}/api/v1/sales/invoices/${invoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(pdfUrl, '_blank');
  };

  const getStatusBadge = (inv: Invoice) => {
    const isOverdue = inv.status === 'Overdue' || (inv.amount_due > 0 && new Date(inv.due_date) < new Date());
    if (inv.status === 'Paid') {
      return <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Paid</span>;
    }
    if (isOverdue) {
      return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Overdue</span>;
    }
    if (inv.status === 'Partially Paid') {
      return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Partially Paid</span>;
    }
    return <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Pending</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Invoices
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
            GST-compliant invoicing -create, send, and track payments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AuditLogButton entityTypes={['invoice', 'payment']} title="Invoices & Payments Audit Log" />
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} style={{ borderRadius: '8px', padding: '10px 20px', fontWeight: 700 }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Top Stats KPI Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Invoiced */}
        <div style={{ background: 'var(--panel)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
            ₹{totalInvoiced.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
            Total Invoiced
          </div>
        </div>

        {/* Card 2: Amount Received */}
        <div style={{ background: 'var(--panel)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
            ₹{amountReceived.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
            Amount Received
          </div>
        </div>

        {/* Card 3: Pending */}
        <div style={{ background: 'var(--panel)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
            ₹{pendingAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
            Pending
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div style={{ background: 'var(--panel)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>
            ₹{overdueAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
            Overdue
          </div>
        </div>
      </div>

      {/* Main Container Card: Search, Date Filter, Tabs & Table */}
      <div style={{ background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)', overflow: 'hidden' }}>
        {/* Top Control Bar: Search & Date Range Filter */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input Box */}
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search by customer or invoice no.."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                }}
              />
            </div>

            {/* Date-Wise Filter Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <Calendar size={15} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', background: 'var(--panel)' }}
              />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', background: 'var(--panel)' }}
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, padding: '2px 6px' }}
                  title="Clear Date Filter"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--line)', margin: '0 -20px -20px -20px', padding: '0 20px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'paid', label: 'Paid' },
              { id: 'pending', label: 'Pending' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'partially_paid', label: 'Partially Paid' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  style={{
                    padding: '10px 4px',
                    border: 'none',
                    background: 'none',
                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    color: isActive ? 'var(--primary)' : 'var(--muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '16px' }}>{error}</div>}

        {/* Invoices Table */}
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>INVOICE NO.</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>CUSTOMER</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>GSTIN</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>INVOICE DATE</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>DUE DATE</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>AMOUNT</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px' }}>STATUS</th>
                <th style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>Loading invoices…</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '44px', color: 'var(--muted)' }}>
                    No invoices found for this selection. Click "Create Invoice" to generate an invoice.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const customer = customersMap[inv.customer_id];
                  const custName = customer?.name || customer?.company || 'Rahul Enterprises';
                  const gstin = customer?.gstin || '07AABCR1234D1Z5';
                  const issueDateStr = new Date(inv.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const dueDateStr = new Date(inv.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const isOverdue = inv.status === 'Overdue' || (inv.amount_due > 0 && new Date(inv.due_date) < new Date());

                  return (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                      onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                    >
                      {/* Invoice Number */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)', fontSize: '13.5px' }}>
                        {inv.invoice_number}
                      </td>

                      {/* Customer Name */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)', fontSize: '13.5px' }}>
                        {custName}
                      </td>

                      {/* GSTIN */}
                      <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '12.5px', fontFamily: 'monospace' }}>
                        {gstin}
                      </td>

                      {/* Invoice Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--text)', fontSize: '13px' }}>
                        {issueDateStr}
                      </td>

                      {/* Due Date */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#ef4444' : 'var(--text)' }}>
                        {dueDateStr}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '14px', color: 'var(--text)' }}>
                        ₹{inv.total_amount.toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(inv)}
                      </td>

                      {/* ACTIONS: 4 Action Buttons */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* 1. View Statement */}
                          <button
                            type="button"
                            title="View Statement"
                            onClick={() => setSelectedCustomerIdForStatement(inv.customer_id)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg-card)',
                              color: 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* 2. Record a Payment */}
                          <button
                            type="button"
                            title="Record Payment"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg-card)',
                              color: 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <IndianRupee size={14} />
                          </button>

                          {/* 3. Send on WhatsApp */}
                          <button
                            type="button"
                            title="Send on WhatsApp"
                            onClick={() => handleSendWhatsApp(inv)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              background: 'rgba(34, 197, 94, 0.12)',
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <MessageCircle size={15} />
                          </button>

                          {/* 4. Download PDF */}
                          <button
                            type="button"
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(inv.id)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg-card)',
                              color: 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchData}
      />

      <RecordPaymentModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onSuccess={fetchData}
      />

      <CustomerStatementModal
        isOpen={!!selectedCustomerIdForStatement}
        onClose={() => setSelectedCustomerIdForStatement(null)}
        customerId={selectedCustomerIdForStatement}
      />
    </div>
  );
}

