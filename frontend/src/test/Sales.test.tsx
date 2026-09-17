import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { InvoicesListPage } from '../features/sales/pages/InvoicesListPage';
import { salesApi } from '../features/sales/services/salesApi';

vi.mock('../features/sales/services/salesApi', () => ({
  salesApi: {
    getInvoices: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'inv-1',
          tenant_id: 'tenant-1',
          customer_id: 'cust-1',
          invoice_number: 'INV-0001',
          status: 'Sent',
          issue_date: new Date().toISOString(),
          due_date: new Date().toISOString(),
          subtotal: 10000,
          tax_amount: 1800,
          total_amount: 11800,
          amount_paid: 0,
          amount_due: 11800,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            {
              id: 'item-1',
              description: 'Software License',
              quantity: 1,
              rate: 10000,
              tax_rate_percent: 18,
              amount: 10000,
              tax_amount: 1800,
              total: 11800,
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    }),
  },
}));

describe('InvoicesListPage Component', () => {
  it('renders invoices list header and invoice table with mock data', async () => {
    render(
      <MemoryRouter>
        <InvoicesListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Invoices & Billing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new invoice/i })).toBeInTheDocument();

    const invNum = await screen.findByText('INV-0001');
    expect(invNum).toBeInTheDocument();
    expect(salesApi.getInvoices).toHaveBeenCalled();
  });
});
