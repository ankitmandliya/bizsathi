import apiClient from './api/client';


export interface Template {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  whatsapp_body?: string | null;
  whatsapp_status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
  whatsapp_provider_template_id?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateCreateInput {
  name: string;
  category: string;
  whatsapp_body?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
}

export interface AudienceCountRequest {
  audience_filter: 'ALL' | 'CITY' | 'CUSTOMER_TYPE';
  audience_filter_value?: string | null;
}

export interface AudienceCountResponse {
  total_customers: number;
  whatsapp_eligible: number;
  email_eligible: number;
  distinct_cities: string[];
  customer_types: string[];
}

export interface Campaign {
  id: string;
  tenant_id: string;
  template_id: string;
  template_name?: string | null;
  name: string;
  audience_filter: string;
  audience_filter_value?: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED_PARTIAL';
  scheduled_at?: string | null;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreateInput {
  name: string;
  template_id: string;
  audience_filter: string;
  audience_filter_value?: string | null;
  scheduled_at?: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  customer_name?: string | null;
  channel: 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  error_reason?: string | null;
  sent_at?: string | null;
}

export interface CampaignDetail extends Campaign {
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  actual_channels_used: string[];
  recipients: CampaignRecipient[];
}

export interface TenantChannelSettings {
  logo_url?: string | null;
  whatsapp_enabled: boolean;
  whatsapp_business_number?: string | null;
  whatsapp_api_key?: string | null;
  email_enabled: boolean;
  email_sender_name?: string | null;
}

export const marketingApi = {
  // Templates
  getTemplates: async (): Promise<Template[]> => {
    const response = await apiClient.get('/marketing/templates');
    return response.data;
  },

  createTemplate: async (data: TemplateCreateInput): Promise<Template> => {
    const response = await apiClient.post('/marketing/templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Partial<TemplateCreateInput>): Promise<Template> => {
    const response = await apiClient.put(`/marketing/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/marketing/templates/${id}`);
  },

  submitTemplateApproval: async (id: string): Promise<Template> => {
    const response = await apiClient.post(`/marketing/templates/${id}/submit-approval`);
    return response.data;
  },

  checkTemplateApproval: async (id: string, statusOverride?: string): Promise<Template> => {
    const response = await apiClient.post(`/marketing/templates/${id}/check-approval`, null, {
      params: { status_override: statusOverride },
    });
    return response.data;
  },

  // Audience
  getAudienceCount: async (request: AudienceCountRequest): Promise<AudienceCountResponse> => {
    const response = await apiClient.post('/marketing/audience-count', request);
    return response.data;
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const response = await apiClient.get('/marketing/campaigns');
    return response.data;
  },

  createCampaign: async (data: CampaignCreateInput): Promise<Campaign> => {
    const response = await apiClient.post('/marketing/campaigns', data);
    return response.data;
  },

  getCampaignDetail: async (id: string): Promise<CampaignDetail> => {
    const response = await apiClient.get(`/marketing/campaigns/${id}`);
    return response.data;
  },

  sendCampaign: async (id: string): Promise<Campaign> => {
    const response = await apiClient.post(`/marketing/campaigns/${id}/send`);
    return response.data;
  },

  // Tenant Channels
  updateChannelSettings: async (data: TenantChannelSettings) => {
    const response = await apiClient.put('/tenants/settings/channels', data);
    return response.data;
  },
};

