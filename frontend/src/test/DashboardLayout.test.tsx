import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardLayout from '../layouts/DashboardLayout';
import AppProviders from '../app/providers/AppProviders';

describe('DashboardLayout Component', () => {
  it('renders sidebar navigation items correctly', () => {
    render(
      <AppProviders>
        <DashboardLayout />
      </AppProviders>,
    );

    expect(screen.getByText('BizSathi')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CRM & Deals')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });
});
