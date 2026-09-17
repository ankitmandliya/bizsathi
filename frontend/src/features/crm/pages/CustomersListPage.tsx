import { useCallback, useEffect, useState } from 'react';
import { Building2, Mail, Phone, UserCheck } from 'lucide-react';
import { Table } from '../../../components/ui/Table';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StateViews } from '../../../components/common/StateViews';
import { crmApi } from '../services/crmApi';
import { Customer } from '../types/crm';
import { getErrorMessage } from '../../../utils/error';

export function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await crmApi.getCustomers();
      setCustomers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load customers'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Customers"
        subtitle="Directory of converted customers from your sales pipeline."
      />

      <div className="table-container">
        <StateViews
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error && customers.length === 0}
          onRetry={loadCustomers}
          emptyTitle="No customers yet"
          emptyDescription="Convert qualified leads or won deals to populate your customer directory."
        >
          <Table
            headers={[
              { key: 'name',      title: 'Customer Name' },
              { key: 'company',   title: 'Company' },
              { key: 'email',     title: 'Email' },
              { key: 'phone',     title: 'Phone' },
              { key: 'converted', title: 'Converted Date' },
            ]}
          >
            {customers.map((cust) => (
              <tr key={cust.id}>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, color: 'var(--text)' }}>
                    <UserCheck size={14} style={{ color: 'var(--success-text)', flexShrink: 0 }} />
                    {cust.name}
                  </span>
                </td>
                <td>
                  {cust.company ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-2)' }}>
                      <Building2 size={12} style={{ color: 'var(--muted)' }} />
                      {cust.company}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {cust.email ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-2)' }}>
                      <Mail size={11} /> {cust.email}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {cust.phone ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--muted-2)' }}>
                      <Phone size={11} /> {cust.phone}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>—</span>
                  )}
                </td>
                <td className="td-muted">
                  {new Date(cust.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </Table>
        </StateViews>
      </div>
    </div>
  );
}
