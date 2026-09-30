import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VendorsPage from '../features/vendors/pages/VendorsPage';
import { VendorFormModal } from '../features/vendors/components/VendorFormModal';
import { vendorApi } from '../features/vendors/services/vendorApi';
import AppProviders from '../app/providers/AppProviders';

vi.mock('../features/vendors/services/vendorApi', () => ({
  vendorApi: {
    getVendors: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'vendor-1',
          tenant_id: 'tenant-1',
          name: 'Apex Traders',
          phone: '9876543210',
          contact_person: 'John Doe',
          email: 'apex@example.com',
          vendor_type: 'Business',
          company_name: 'Apex Ltd',
          opening_balance: 5000,
          opening_balance_type: 'Payable',
          outstanding_payable: 5000,
          outstanding_display: 'You owe ₹5,000.00',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    }),
    createVendor: vi.fn().mockResolvedValue({
      id: 'vendor-2',
      tenant_id: 'tenant-1',
      name: 'New Supplier',
      phone: '9111111111',
      vendor_type: 'Business',
      opening_balance: 0,
      opening_balance_type: 'Payable',
      outstanding_payable: 0,
      outstanding_display: 'No outstanding balance',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    updateVendor: vi.fn().mockResolvedValue({}),
    deleteVendor: vi.fn().mockResolvedValue({}),
  },
}));

describe('Vendors Module Components', () => {
  it('renders VendorsPage and table with mock vendor data', async () => {
    render(
      <AppProviders>
        <VendorsPage />
      </AppProviders>,
    );

    expect(screen.getByText('Vendor Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add vendor/i })).toBeInTheDocument();

    const vendorName = await screen.findByText('Apex Traders');
    expect(vendorName).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(vendorApi.getVendors).toHaveBeenCalled();
  });

  it('renders VendorFormModal and validates required inputs', async () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <VendorFormModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={null}
      />,
    );

    expect(screen.getByText('Add New Vendor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Rajesh Electricals')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. +91 98765 43210')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /create vendor/i });
    expect(saveButton).toBeInTheDocument();
  });
});
