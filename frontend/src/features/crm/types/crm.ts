export interface PipelineStage {
  id: string;
  tenant_id: string;
  name: string;
  order: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  job_title?: string | null;
  website?: string | null;
  source: string;
  status: string;
  priority: string;
  industry?: string | null;
  estimated_value: number;
  assigned_user_id?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LeadCreate {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  job_title?: string;
  website?: string;
  source?: string;
  status?: string;
  priority?: string;
  industry?: string;
  estimated_value?: number;
  assigned_user_id?: string;
  follow_up_date?: string;
  notes?: string;
  lost_reason?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export type LeadUpdate = Partial<LeadCreate>;

export interface PaginatedLeads {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface Deal {
  id: string;
  tenant_id: string;
  title: string;
  value: number;
  currency: string;
  stage_id: string;
  stage?: PipelineStage | null;
  lead_id?: string | null;
  customer_id?: string | null;
  probability: number;
  expected_closing_date?: string | null;
  actual_closing_date?: string | null;
  owner_id?: string | null;
  won_reason?: string | null;
  lost_reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DealCreate {
  title: string;
  value?: number;
  currency?: string;
  stage_id: string;
  lead_id?: string;
  customer_id?: string;
  probability?: number;
  expected_closing_date?: string;
  owner_id?: string;
  notes?: string;
}

export interface DealUpdate extends Partial<DealCreate> {
  won_reason?: string;
  lost_reason?: string;
  actual_closing_date?: string;
}

export interface PaginatedDeals {
  items: Deal[];
  total: number;
  page: number;
  limit: number;
}

export interface Activity {
  id: string;
  tenant_id: string;
  type: string; // Call, Meeting, Email, WhatsApp, Note, Task
  subject: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  status: string; // pending, completed
  priority: string;
  assigned_user_id?: string | null;
  created_by_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  customer_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  type?: string;
  subject: string;
  description?: string;
  due_date?: string;
  status?: string;
  priority?: string;
  assigned_user_id?: string;
  lead_id?: string;
  deal_id?: string;
  customer_id?: string;
}

export interface ActivityUpdate extends Partial<ActivityCreate> {
  completed_at?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  converted_from_lead_id?: string | null;
  assigned_user_id?: string | null;
  created_at: string;
  updated_at: string;
}
