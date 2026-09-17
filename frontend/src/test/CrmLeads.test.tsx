import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LeadsListPage } from '../features/crm/pages/LeadsListPage';
import { crmApi } from '../features/crm/services/crmApi';

vi.mock('../features/crm/services/crmApi', () => ({
  crmApi: {
    getLeads: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'lead-1',
          name: 'TechCorp Lead',
          company: 'TechCorp Inc',
          email: 'tech@corp.com',
          status: 'New',
          priority: 'High',
          source: 'Website',
          estimated_value: 25000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 15,
    }),
  },
}));

describe('LeadsListPage Component', () => {
  it('renders leads header and leads table with mock data', async () => {
    render(
      <MemoryRouter>
        <LeadsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Leads & CRM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add lead/i })).toBeInTheDocument();

    const leadName = await screen.findByText('TechCorp Lead');
    expect(leadName).toBeInTheDocument();
    expect(crmApi.getLeads).toHaveBeenCalled();
  });
});
