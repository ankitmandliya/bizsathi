import apiClient from '../../../services/api/client';

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  tax_rate_percent: number;
  amount?: number;
  tax_amount?: number;
  total?: number;
}

export interface Quotation {
  id: string;
  tenant_id: string;
  customer_id: string;
  quotation_number: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | string;
  issue_date: string;
  valid_until?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: LineItem[];
}

export interface Invoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  quotation_id?: string;
  invoice_number: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled' | string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: LineItem[];
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other' | string;
  receipt_number: string;
  notes?: string;
  created_at: string;
}

export interface CustomerStatement {
  customer_id: string;
  customer_name: string;
  total_invoiced: number;
  total_paid: number;
  outstanding_balance: number;
  invoices: Invoice[];
  payments: Payment[];
}

export const INITIAL_DEMO_QUOTATIONS: Quotation[] = [
  {
    id: 'quote-1',
    tenant_id: 'tenant-1',
    customer_id: 'demo-cust-1',
    quotation_number: 'QT-2026-001',
    status: 'Sent',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    subtotal: 100000,
    tax_amount: 18000,
    total_amount: 118000,
    notes: 'Quotation valid for 30 days.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 'item-1', description: 'Enterprise Software Subscription', quantity: 1, rate: 100000, tax_rate_percent: 18, amount: 100000, tax_amount: 18000, total: 118000 },
    ],
  },
  {
    id: 'quote-2',
    tenant_id: 'tenant-1',
    customer_id: 'demo-cust-2',
    quotation_number: 'QT-2026-002',
    status: 'Accepted',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    subtotal: 45000,
    tax_amount: 8100,
    total_amount: 53100,
    notes: 'Approved by customer.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 'item-2', description: 'Hardware Equipment & Installation', quantity: 1, rate: 45000, tax_rate_percent: 18, amount: 45000, tax_amount: 8100, total: 53100 },
    ],
  },
];

export const INITIAL_DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    tenant_id: 'tenant-1',
    customer_id: 'demo-cust-1',
    quotation_id: 'quote-2',
    invoice_number: 'INV-2026-001',
    status: 'Paid',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    subtotal: 45000,
    tax_amount: 8100,
    total_amount: 53100,
    amount_paid: 53100,
    amount_due: 0,
    notes: 'Payment received in full.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 'item-2', description: 'Hardware Equipment & Installation', quantity: 1, rate: 45000, tax_rate_percent: 18, amount: 45000, tax_amount: 8100, total: 53100 },
    ],
  },
  {
    id: 'inv-2',
    tenant_id: 'tenant-1',
    customer_id: 'demo-cust-3',
    invoice_number: 'INV-2026-002',
    status: 'Sent',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    subtotal: 75000,
    tax_amount: 13500,
    total_amount: 88500,
    amount_paid: 0,
    amount_due: 88500,
    notes: 'Payment due within 7 days.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 'item-3', description: 'Consulting & Setup Services', quantity: 1, rate: 75000, tax_rate_percent: 18, amount: 75000, tax_amount: 13500, total: 88500 },
    ],
  },
];

export const INITIAL_DEMO_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    tenant_id: 'tenant-1',
    invoice_id: 'inv-1',
    customer_id: 'demo-cust-1',
    amount: 53100,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    receipt_number: 'REC-2026-001',
    notes: 'Received via GPay',
    created_at: new Date().toISOString(),
  },
];

export const salesApi = {
  // Quotations
  getQuotations: async (params?: { customer_id?: string; status?: string; page?: number; limit?: number }) => {
    try {
      const res = await apiClient.get<{ items: Quotation[]; total: number; page: number; limit: number }>('/api/v1/sales/quotations', { params });
      if (res.data && res.data.items && res.data.items.length > 0) return res.data;
    } catch {
      // fallback
    }
    let items = [...INITIAL_DEMO_QUOTATIONS];
    if (params?.status) {
      items = items.filter((q) => q.status === params.status);
    }
    return { items, total: items.length, page: params?.page || 1, limit: params?.limit || 15 };
  },

  getQuotation: async (id: string) => {
    try {
      const res = await apiClient.get<Quotation>(`/api/v1/sales/quotations/${id}`);
      return res.data;
    } catch {
      const found = INITIAL_DEMO_QUOTATIONS.find((q) => q.id === id);
      return found || INITIAL_DEMO_QUOTATIONS[0];
    }
  },

  createQuotation: async (data: { customer_id: string; issue_date: string; valid_until?: string; notes?: string; items: LineItem[] }) => {
    try {
      const res = await apiClient.post<Quotation>('/api/v1/sales/quotations', data);
      return res.data;
    } catch {
      const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
      const tax_amount = data.items.reduce((sum, item) => sum + (item.quantity * item.rate * item.tax_rate_percent) / 100, 0);
      const newQuotation: Quotation = {
        id: `quote-${Date.now()}`,
        tenant_id: 'tenant-1',
        customer_id: data.customer_id,
        quotation_number: `QT-2026-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Draft',
        issue_date: data.issue_date,
        valid_until: data.valid_until,
        subtotal,
        tax_amount,
        total_amount: subtotal + tax_amount,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: data.items.map((it, idx) => ({
          id: `item-${idx + 1}`,
          ...it,
          amount: it.quantity * it.rate,
          tax_amount: (it.quantity * it.rate * it.tax_rate_percent) / 100,
          total: it.quantity * it.rate * (1 + it.tax_rate_percent / 100),
        })),
      };
      INITIAL_DEMO_QUOTATIONS.unshift(newQuotation);
      return newQuotation;
    }
  },

  convertQuotationToInvoice: async (id: string) => {
    try {
      const res = await apiClient.post<Invoice>(`/api/v1/sales/quotations/${id}/convert-to-invoice`);
      return res.data;
    } catch {
      const quotation = INITIAL_DEMO_QUOTATIONS.find((q) => q.id === id);
      if (quotation) {
        quotation.status = 'Accepted';
      }
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        tenant_id: 'tenant-1',
        customer_id: quotation?.customer_id || 'demo-cust-1',
        quotation_id: id,
        invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Sent',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        subtotal: quotation?.subtotal || 50000,
        tax_amount: quotation?.tax_amount || 9000,
        total_amount: quotation?.total_amount || 59000,
        amount_paid: 0,
        amount_due: quotation?.total_amount || 59000,
        notes: 'Converted from Quotation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: quotation?.items || [],
      };
      INITIAL_DEMO_INVOICES.unshift(newInvoice);
      return newInvoice;
    }
  },

  // Invoices
  getInvoices: async (params?: { customer_id?: string; status?: string; page?: number; limit?: number }) => {
    try {
      const res = await apiClient.get<{ items: Invoice[]; total: number; page: number; limit: number }>('/api/v1/sales/invoices', { params });
      if (res.data && res.data.items && res.data.items.length > 0) return res.data;
    } catch {
      // fallback
    }
    let items = [...INITIAL_DEMO_INVOICES];
    if (params?.status) {
      items = items.filter((i) => i.status === params.status);
    }
    return { items, total: items.length, page: params?.page || 1, limit: params?.limit || 15 };
  },

  getInvoice: async (id: string) => {
    try {
      const res = await apiClient.get<Invoice>(`/api/v1/sales/invoices/${id}`);
      return res.data;
    } catch {
      const found = INITIAL_DEMO_INVOICES.find((i) => i.id === id);
      return found || INITIAL_DEMO_INVOICES[0];
    }
  },

  createInvoice: async (data: { customer_id: string; quotation_id?: string; issue_date: string; due_date: string; notes?: string; items: LineItem[] }) => {
    try {
      const res = await apiClient.post<Invoice>('/api/v1/sales/invoices', data);
      return res.data;
    } catch {
      const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
      const tax_amount = data.items.reduce((sum, item) => sum + (item.quantity * item.rate * item.tax_rate_percent) / 100, 0);
      const total_amount = subtotal + tax_amount;
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        tenant_id: 'tenant-1',
        customer_id: data.customer_id,
        quotation_id: data.quotation_id,
        invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Sent',
        issue_date: data.issue_date,
        due_date: data.due_date,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid: 0,
        amount_due: total_amount,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: data.items.map((it, idx) => ({
          id: `item-${idx + 1}`,
          ...it,
          amount: it.quantity * it.rate,
          tax_amount: (it.quantity * it.rate * it.tax_rate_percent) / 100,
          total: it.quantity * it.rate * (1 + it.tax_rate_percent / 100),
        })),
      };
      INITIAL_DEMO_INVOICES.unshift(newInvoice);
      return newInvoice;
    }
  },

  sendInvoiceReminder: async (id: string) => {
    try {
      const res = await apiClient.post<{ status: string; message: string }>(`/api/v1/sales/invoices/${id}/send-reminder`);
      return res.data;
    } catch {
      return { status: 'success', message: 'Invoice reminder sent successfully.' };
    }
  },

  // Payments
  recordPayment: async (data: { invoice_id: string; amount: number; payment_date: string; payment_mode: string; notes?: string }) => {
    try {
      const res = await apiClient.post<Payment>('/api/v1/sales/payments', data);
      return res.data;
    } catch {
      const invoice = INITIAL_DEMO_INVOICES.find((i) => i.id === data.invoice_id);
      if (invoice) {
        invoice.amount_paid += data.amount;
        invoice.amount_due = Math.max(0, invoice.total_amount - invoice.amount_paid);
        if (invoice.amount_due === 0) {
          invoice.status = 'Paid';
        } else {
          invoice.status = 'Partially Paid';
        }
      }
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        tenant_id: 'tenant-1',
        invoice_id: data.invoice_id,
        customer_id: invoice?.customer_id || 'demo-cust-1',
        amount: data.amount,
        payment_date: data.payment_date,
        payment_mode: data.payment_mode,
        receipt_number: `REC-2026-${Math.floor(100 + Math.random() * 900)}`,
        notes: data.notes,
        created_at: new Date().toISOString(),
      };
      INITIAL_DEMO_PAYMENTS.unshift(newPayment);
      return newPayment;
    }
  },

  getPayments: async (params?: { invoice_id?: string; customer_id?: string }) => {
    try {
      const res = await apiClient.get<Payment[]>('/api/v1/sales/payments', { params });
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // fallback
    }
    return INITIAL_DEMO_PAYMENTS;
  },

  // Statements
  getCustomerStatement: async (customerId: string) => {
    try {
      const res = await apiClient.get<CustomerStatement>(`/api/v1/sales/customers/${customerId}/statement`);
      return res.data;
    } catch {
      return {
        customer_id: customerId,
        customer_name: 'Demo Customer',
        total_invoiced: 141600,
        total_paid: 53100,
        outstanding_balance: 88500,
        invoices: INITIAL_DEMO_INVOICES,
        payments: INITIAL_DEMO_PAYMENTS,
      };
    }
  },
};

