import { useState } from 'react';
import { Briefcase, UserCheck, Users } from 'lucide-react';
import { LeadsListPage } from './LeadsListPage';
import { DealsListPage } from './DealsListPage';
import { CustomersListPage } from './CustomersListPage';

type TabType = 'leads' | 'deals' | 'customers';

const tabs: { id: TabType; label: string; icon: typeof Users }[] = [
  { id: 'leads',     label: 'Leads',          icon: Users },
  { id: 'deals',     label: 'Deals Pipeline',  icon: Briefcase },
  { id: 'customers', label: 'Customers',        icon: UserCheck },
];

export function CrmMainPage() {
  const [activeTab, setActiveTab] = useState<TabType>('leads');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Tabs bar */}
      <div className="tabs-bar" style={{ marginBottom: '24px' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`tab-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-selected={activeTab === id}
            role="tab"
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'leads'     && <LeadsListPage />}
        {activeTab === 'deals'     && <DealsListPage />}
        {activeTab === 'customers' && <CustomersListPage />}
      </div>
    </div>
  );
}
