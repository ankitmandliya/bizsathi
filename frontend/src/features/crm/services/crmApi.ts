import apiClient from '../../../services/api/client';
import {
  Activity,
  ActivityCreate,
  ActivityUpdate,
  Customer,
  Deal,
  DealCreate,
  DealUpdate,
  Lead,
  LeadCreate,
  LeadUpdate,
  PaginatedDeals,
  PaginatedLeads,
  PipelineStage,
} from '../types/crm';

export type { Customer };

export const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'demo-cust-1',
    tenant_id: 'tenant-1',
    name: 'Vikram Singh',
    company: 'Singh Hardware',
    email: 'vikram@singh.com',
    phone: '+91 98765 43210',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-cust-2',
    tenant_id: 'tenant-1',
    name: 'Sunita Gupta',
    company: 'Gupta Electronics',
    email: 'sunita@gupta.com',
    phone: '+91 98123 45678',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-cust-3',
    tenant_id: 'tenant-1',
    name: 'Priya Mehta',
    company: 'Mehta Fabrics',
    email: 'priya@mehta.com',
    phone: '+91 97654 32109',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_DEMO_STAGES: PipelineStage[] = [
  { id: 'stage-1', tenant_id: 'tenant-1', name: 'Lead Qualified', order: 1, probability: 20, is_won: false, is_lost: false, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stage-2', tenant_id: 'tenant-1', name: 'Contact Made', order: 2, probability: 40, is_won: false, is_lost: false, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stage-3', tenant_id: 'tenant-1', name: 'Proposal Sent', order: 3, probability: 70, is_won: false, is_lost: false, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stage-4', tenant_id: 'tenant-1', name: 'Negotiation', order: 4, probability: 90, is_won: false, is_lost: false, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stage-5', tenant_id: 'tenant-1', name: 'Closed Won', order: 5, probability: 100, is_won: true, is_lost: false, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const INITIAL_DEMO_DEALS: Deal[] = [
  { id: 'deal-1', tenant_id: 'tenant-1', title: 'Hardware Procurement Contract', value: 250000, currency: 'INR', stage_id: 'stage-1', probability: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'deal-2', tenant_id: 'tenant-1', title: 'Enterprise Software Subscription', value: 540000, currency: 'INR', stage_id: 'stage-3', probability: 70, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'deal-3', tenant_id: 'tenant-1', title: 'Annual Maintenance Service', value: 120000, currency: 'INR', stage_id: 'stage-5', probability: 100, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const INITIAL_DEMO_LEADS: Lead[] = [
  {
    id: 'lead-1',
    tenant_id: 'tenant-1',
    name: 'Rajesh Kumar',
    email: 'rajesh@techcorp.in',
    phone: '+91 98765 12345',
    company: 'TechCorp India',
    status: 'New',
    source: 'Website',
    priority: 'High',
    estimated_value: 250000,
    notes: 'Interested in enterprise license',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead-2',
    tenant_id: 'tenant-1',
    name: 'Anita Sharma',
    email: 'anita@apexsolutions.com',
    phone: '+91 98111 22334',
    company: 'Apex Solutions',
    status: 'Contacted',
    source: 'Referral',
    priority: 'Medium',
    estimated_value: 180000,
    notes: 'Follow up next Tuesday',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead-3',
    tenant_id: 'tenant-1',
    name: 'Amit Patel',
    email: 'amit@pateltrading.co',
    phone: '+91 97222 33445',
    company: 'Patel Trading Co.',
    status: 'Qualified',
    source: 'LinkedIn',
    priority: 'High',
    estimated_value: 500000,
    notes: 'Ready for demo presentation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_DEMO_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    tenant_id: 'tenant-1',
    type: 'Call',
    subject: 'Initial Discovery Call',
    description: 'Discussed project timeline and requirements.',
    status: 'completed',
    priority: 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'act-2',
    tenant_id: 'tenant-1',
    type: 'Email',
    subject: 'Sent Proposal & Pricing',
    description: 'Shared detailed commercial quote.',
    status: 'completed',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const crmApi = {
  // --- Pipeline Stages ---
  getPipelineStages: async (): Promise<PipelineStage[]> => {
    try {
      const response = await apiClient.get<PipelineStage[]>('/api/v1/crm/pipeline-stages');
      if (response.data && response.data.length > 0) return response.data;
      return INITIAL_DEMO_STAGES;
    } catch {
      return INITIAL_DEMO_STAGES;
    }
  },

  // --- Leads ---
  getLeads: async (params?: {
    search?: string;
    status?: string;
    source?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedLeads> => {
    try {
      const response = await apiClient.get<PaginatedLeads>('/api/v1/crm/leads', { params });
      if (response.data && response.data.items && response.data.items.length > 0) return response.data;
    } catch {
      // fallback to demo leads
    }
    let filtered = [...INITIAL_DEMO_LEADS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.company && l.company.toLowerCase().includes(q))
      );
    }
    if (params?.status) {
      filtered = filtered.filter((l) => l.status === params.status);
    }
    if (params?.source) {
      filtered = filtered.filter((l) => l.source === params.source);
    }
    if (params?.priority) {
      filtered = filtered.filter((l) => l.priority === params.priority);
    }
    return { items: filtered, total: filtered.length, page: params?.page || 1, limit: params?.limit || 100 };
  },

  getLead: async (id: string): Promise<Lead> => {
    try {
      const response = await apiClient.get<Lead>(`/api/v1/crm/leads/${id}`);
      return response.data;
    } catch {
      const found = INITIAL_DEMO_LEADS.find((l) => l.id === id);
      return (
        found || {
          id,
          tenant_id: 'tenant-1',
          name: 'Demo Lead',
          email: 'demo@lead.com',
          company: 'Demo Company',
          status: 'New',
          source: 'Website',
          priority: 'Medium',
          estimated_value: 100000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
    }
  },

  createLead: async (data: LeadCreate): Promise<Lead> => {
    try {
      const response = await apiClient.post<Lead>('/api/v1/crm/leads', data);
      return response.data;
    } catch {
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        tenant_id: 'tenant-1',
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        status: data.status || 'New',
        source: data.source || 'Website',
        priority: data.priority || 'Medium',
        estimated_value: data.estimated_value || 0,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      INITIAL_DEMO_LEADS.unshift(newLead);
      return newLead;
    }
  },

  updateLead: async (id: string, data: LeadUpdate): Promise<Lead> => {
    try {
      const response = await apiClient.put<Lead>(`/api/v1/crm/leads/${id}`, data);
      return response.data;
    } catch {
      const index = INITIAL_DEMO_LEADS.findIndex((l) => l.id === id);
      if (index !== -1) {
        INITIAL_DEMO_LEADS[index] = { ...INITIAL_DEMO_LEADS[index], ...data, updated_at: new Date().toISOString() };
        return INITIAL_DEMO_LEADS[index];
      }
      return {
        id,
        tenant_id: 'tenant-1',
        name: data.name || 'Lead',
        source: data.source || 'Website',
        status: data.status || 'New',
        priority: data.priority || 'Medium',
        estimated_value: data.estimated_value || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  deleteLead: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/v1/crm/leads/${id}`);
    } catch {
      const index = INITIAL_DEMO_LEADS.findIndex((l) => l.id === id);
      if (index !== -1) {
        INITIAL_DEMO_LEADS.splice(index, 1);
      }
    }
  },

  convertLead: async (id: string): Promise<Customer> => {
    try {
      const response = await apiClient.post<Customer>(`/api/v1/crm/leads/${id}/convert`);
      return response.data;
    } catch {
      const lead = INITIAL_DEMO_LEADS.find((l) => l.id === id);
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        tenant_id: 'tenant-1',
        name: lead?.name || 'Converted Customer',
        company: lead?.company,
        email: lead?.email,
        phone: lead?.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      INITIAL_DEMO_CUSTOMERS.unshift(newCust);
      return newCust;
    }
  },

  // --- Deals ---
  getDeals: async (params?: {
    stage_id?: string;
    lead_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedDeals> => {
    try {
      const response = await apiClient.get<PaginatedDeals>('/api/v1/crm/deals', { params });
      if (response.data && response.data.items && response.data.items.length > 0) return response.data;
    } catch {
      // fallback
    }
    let filtered = [...INITIAL_DEMO_DEALS];
    if (params?.stage_id) {
      filtered = filtered.filter((d) => d.stage_id === params.stage_id);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((d) => d.title.toLowerCase().includes(q));
    }
    return { items: filtered, total: filtered.length, page: params?.page || 1, limit: params?.limit || 15 };
  },

  getDeal: async (id: string): Promise<Deal> => {
    try {
      const response = await apiClient.get<Deal>(`/api/v1/crm/deals/${id}`);
      return response.data;
    } catch {
      const found = INITIAL_DEMO_DEALS.find((d) => d.id === id);
      return found || INITIAL_DEMO_DEALS[0];
    }
  },

  createDeal: async (data: DealCreate): Promise<Deal> => {
    try {
      const response = await apiClient.post<Deal>('/api/v1/crm/deals', data);
      return response.data;
    } catch {
      const stage = INITIAL_DEMO_STAGES.find((s) => s.id === data.stage_id);
      const newDeal: Deal = {
        id: `deal-${Date.now()}`,
        tenant_id: 'tenant-1',
        title: data.title,
        value: data.value ?? 0,
        currency: data.currency || 'INR',
        stage_id: data.stage_id,
        stage,
        probability: data.probability ?? (stage?.probability || 50),
        expected_closing_date: data.expected_closing_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      INITIAL_DEMO_DEALS.unshift(newDeal);
      return newDeal;
    }
  },

  updateDeal: async (id: string, data: DealUpdate): Promise<Deal> => {
    try {
      const response = await apiClient.put<Deal>(`/api/v1/crm/deals/${id}`, data);
      return response.data;
    } catch {
      const index = INITIAL_DEMO_DEALS.findIndex((d) => d.id === id);
      if (index !== -1) {
        INITIAL_DEMO_DEALS[index] = { ...INITIAL_DEMO_DEALS[index], ...data, updated_at: new Date().toISOString() };
        return INITIAL_DEMO_DEALS[index];
      }
      return { id, tenant_id: 'tenant-1', title: data.title || 'Deal', value: data.value || 0, currency: 'INR', stage_id: 'stage-1', probability: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
  },

  deleteDeal: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/v1/crm/deals/${id}`);
    } catch {
      const index = INITIAL_DEMO_DEALS.findIndex((d) => d.id === id);
      if (index !== -1) {
        INITIAL_DEMO_DEALS.splice(index, 1);
      }
    }
  },

  // --- Activities ---
  getActivities: async (params?: {
    lead_id?: string;
    deal_id?: string;
    customer_id?: string;
  }): Promise<Activity[]> => {
    try {
      const response = await apiClient.get<Activity[]>('/api/v1/crm/activities', { params });
      if (response.data && response.data.length > 0) return response.data;
      return INITIAL_DEMO_ACTIVITIES;
    } catch {
      return INITIAL_DEMO_ACTIVITIES;
    }
  },

  createActivity: async (data: ActivityCreate): Promise<Activity> => {
    try {
      const response = await apiClient.post<Activity>('/api/v1/crm/activities', data);
      return response.data;
    } catch {
      const newAct: Activity = {
        id: `act-${Date.now()}`,
        tenant_id: 'tenant-1',
        type: data.type || 'Note',
        subject: data.subject,
        description: data.description,
        status: data.status || 'pending',
        priority: data.priority || 'normal',
        lead_id: data.lead_id,
        deal_id: data.deal_id,
        customer_id: data.customer_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      INITIAL_DEMO_ACTIVITIES.unshift(newAct);
      return newAct;
    }
  },

  updateActivity: async (id: string, data: ActivityUpdate): Promise<Activity> => {
    try {
      const response = await apiClient.put<Activity>(`/api/v1/crm/activities/${id}`, data);
      return response.data;
    } catch {
      const index = INITIAL_DEMO_ACTIVITIES.findIndex((a) => a.id === id);
      if (index !== -1) {
        INITIAL_DEMO_ACTIVITIES[index] = { ...INITIAL_DEMO_ACTIVITIES[index], ...data, updated_at: new Date().toISOString() };
        return INITIAL_DEMO_ACTIVITIES[index];
      }
      return {
        id,
        tenant_id: 'tenant-1',
        type: data.type || 'Note',
        subject: data.subject || 'Activity',
        status: data.status || 'pending',
        priority: data.priority || 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  // --- Customers ---
  getCustomers: async (): Promise<Customer[]> => {
    try {
      const response = await apiClient.get<Customer[]>('/api/v1/crm/customers');
      if (response.data && response.data.length > 0) {
        return response.data;
      }
      return INITIAL_DEMO_CUSTOMERS;
    } catch {
      return INITIAL_DEMO_CUSTOMERS;
    }
  },
};



