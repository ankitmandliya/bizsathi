import apiClient from './client';

export interface AdminDashboardStats {
  total_businesses: number;
  active_businesses: number;
  suspended_businesses: number;
  new_this_week: number;
  new_this_month: number;
  setup_pending_count: number;
  trial_count: number;
  active_count: number;
  past_due_count: number;
  grace_period_count: number;
  suspended_count: number;
  expired_count: number;
  mrr: number;
}

export interface BusinessListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_via: string;
  created_at: string;
  member_count: number;
  owner_name?: string;
  owner_email?: string;
  setup_pending: boolean;
  suspended_at?: string;
  suspended_reason?: string;
  current_plan_name?: string;
  subscription_status?: string;
  invitation_email_status?: string;
  last_invitation_sent_at?: string;
}

export interface PaginatedBusinessesResponse {
  items: BusinessListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  is_active: boolean;
  status: string;
  created_via: string;
  created_at: string;
  suspended_at?: string;
  suspended_reason?: string;
  member_count: number;
  owner: {
    id?: string;
    full_name?: string;
    email?: string;
    is_active?: boolean;
  };
  setup_pending: boolean;
  current_plan_name?: string;
  subscription_status?: string;
  invitation_email_status?: string;
  last_invitation_sent_at?: string;
}

export interface ModuleItem {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlementItem {
  id: string;
  plan_id: string;
  module_id: string;
  included: boolean;
  module?: ModuleItem;
}

export interface PlanItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  user_limit?: number;
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
  entitlements?: PlanEntitlementItem[];
  created_at: string;
  updated_at: string;
}

export interface SubscriptionItem {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  pending_downgrade_plan_id?: string;
  plan?: PlanItem;
  included_modules: string[];
  user_count: number;
  user_limit?: number;
  created_at: string;
  updated_at: string;
}

export interface BillingPaymentItem {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  amount: number;
  status: string;
  provider: string;
  provider_payment_id?: string;
  provider_order_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoiceItem {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  payment_id?: string;
  invoice_number: string;
  period_start?: string;
  period_end?: string;
  subtotal: number;
  tax_amount: number;
  tax_rate_percent: number;
  total: number;
  status: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CouponItem {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  used_count: number;
  applicable_plan_ids?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProvisionedBusinessRequest {
  name: string;
  owner_name: string;
  owner_email: string;
}

export interface SuspendBusinessRequest {
  reason: string;
}

export interface EmailSettings {
  configured: boolean;
  provider: string;
  host: string;
  port: number;
  security: string;
  username: string;
  from_email: string;
  from_name: string;
  connection_status: string;
  last_test_at?: string;
  last_test_status?: string;
  last_test_recipient?: string;
}

export interface PlatformSettings {
  maintenance_mode: boolean;
  public_signup_enabled: boolean;
  default_rate_limit: number;
  app_env: string;
  updated_at?: string;
  email_settings?: EmailSettings;
}

export interface AuditLogItem {
  id: string;
  created_at: string;
  actor_name?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_label?: string;
  changes?: Record<string, unknown>;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface PaginatedAuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TenantUsageItem {
  tenant_id: string;
  business_name: string;
  slug: string;
  plan_name: string;
  plan_slug: string;
  user_count: number;
  user_limit?: number;
  customer_count: number;
  employee_count: number;
  invoices_this_month: number;
  status: string;
  subscription_status: string;
}

export interface PaginatedTenantUsageResponse {
  items: TenantUsageItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const adminApi = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const res = await apiClient.get<AdminDashboardStats>('/api/v1/admin/dashboard');
    return res.data;
  },

  getUsage: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    sort_by?: string;
  }): Promise<PaginatedTenantUsageResponse> => {
    const res = await apiClient.get<PaginatedTenantUsageResponse>('/api/v1/admin/usage', { params });
    return res.data;
  },

  getTenantUsageDetail: async (tenantId: string) => {
    const res = await apiClient.get(`/api/v1/admin/usage/${tenantId}`);
    return res.data;
  },

  getBusinesses: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedBusinessesResponse> => {
    const res = await apiClient.get<PaginatedBusinessesResponse>('/api/v1/admin/businesses', { params });
    return res.data;
  },

  getBusinessDetail: async (tenantId: string): Promise<BusinessDetail> => {
    const res = await apiClient.get<BusinessDetail>(`/api/v1/admin/businesses/${tenantId}`);
    return res.data;
  },

  createProvisionedBusiness: async (data: CreateProvisionedBusinessRequest): Promise<BusinessDetail> => {
    const res = await apiClient.post<BusinessDetail>('/api/v1/admin/businesses', data);
    return res.data;
  },

  resendInvitation: async (tenantId: string): Promise<BusinessDetail> => {
    const res = await apiClient.post<BusinessDetail>(`/api/v1/admin/businesses/${tenantId}/resend-invitation`);
    return res.data;
  },

  getSetupLink: async (tenantId: string): Promise<{ tenant_id: string; owner_email: string; owner_name: string; setup_url: string; expires_at: string }> => {
    const res = await apiClient.get<{ tenant_id: string; owner_email: string; owner_name: string; setup_url: string; expires_at: string }>(`/api/v1/admin/businesses/${tenantId}/setup-link`);
    return res.data;
  },

  manualVerifySetup: async (tenantId: string, password?: string): Promise<{ business: BusinessDetail; owner_email: string; configured_password: string; message: string }> => {
    const res = await apiClient.post<{ business: BusinessDetail; owner_email: string; configured_password: string; message: string }>(`/api/v1/admin/businesses/${tenantId}/manual-verify-setup`, { password });
    return res.data;
  },

  suspendBusiness: async (tenantId: string, reason: string): Promise<BusinessDetail> => {
    const res = await apiClient.put<BusinessDetail>(`/api/v1/admin/businesses/${tenantId}/suspend`, { reason });
    return res.data;
  },

  reactivateBusiness: async (tenantId: string): Promise<BusinessDetail> => {
    const res = await apiClient.put<BusinessDetail>(`/api/v1/admin/businesses/${tenantId}/reactivate`);
    return res.data;
  },

  getModules: async (): Promise<ModuleItem[]> => {
    const res = await apiClient.get<ModuleItem[]>('/api/v1/admin/modules');
    return res.data;
  },

  getPlans: async (): Promise<PlanItem[]> => {
    const res = await apiClient.get<PlanItem[]>('/api/v1/admin/plans');
    return res.data;
  },

  createPlan: async (data: {
    name: string;
    slug: string;
    description?: string;
    price_monthly: number;
    price_yearly: number;
    user_limit?: number;
    trial_days: number;
    is_active: boolean;
    is_public: boolean;
    module_ids: string[];
  }): Promise<PlanItem> => {
    const res = await apiClient.post<PlanItem>('/api/v1/admin/plans', data);
    return res.data;
  },

  updatePlan: async (planId: string, data: Partial<PlanItem> & { module_ids?: string[] }): Promise<PlanItem> => {
    const res = await apiClient.put<PlanItem>(`/api/v1/admin/plans/${planId}`, data);
    return res.data;
  },

  getSubscriptions: async (statusFilter?: string): Promise<SubscriptionItem[]> => {
    const res = await apiClient.get<SubscriptionItem[]>('/api/v1/admin/subscriptions', { params: { status: statusFilter } });
    return res.data;
  },

  overrideSubscription: async (data: {
    tenant_id: string;
    plan_id: string;
    status: string;
    billing_cycle: string;
  }): Promise<SubscriptionItem> => {
    const res = await apiClient.post<SubscriptionItem>('/api/v1/admin/subscriptions/override', data);
    return res.data;
  },

  getPayments: async (): Promise<BillingPaymentItem[]> => {
    const res = await apiClient.get<BillingPaymentItem[]>('/api/v1/admin/billing/payments');
    return res.data;
  },

  getInvoices: async (): Promise<BillingInvoiceItem[]> => {
    const res = await apiClient.get<BillingInvoiceItem[]>('/api/v1/admin/billing/invoices');
    return res.data;
  },

  getCoupons: async (): Promise<CouponItem[]> => {
    const res = await apiClient.get<CouponItem[]>('/api/v1/admin/coupons');
    return res.data;
  },

  createCoupon: async (data: {
    code: string;
    discount_type: string;
    discount_value: number;
    valid_from?: string;
    valid_until?: string;
    max_uses?: number;
    applicable_plan_ids?: string[];
    is_active: boolean;
  }): Promise<CouponItem> => {
    const res = await apiClient.post<CouponItem>('/api/v1/admin/coupons', data);
    return res.data;
  },

  updateCoupon: async (couponId: string, data: Partial<CouponItem>): Promise<CouponItem> => {
    const res = await apiClient.put<CouponItem>(`/api/v1/admin/coupons/${couponId}`, data);
    return res.data;
  },

  deleteCoupon: async (couponId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/coupons/${couponId}`);
  },

  getAuditLogs: async (params?: {
    page?: number;
    page_size?: number;
    tenant_id?: string;
    user_id?: string;
    action?: string;
    entity_type?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedAuditLogsResponse> => {
    const res = await apiClient.get<PaginatedAuditLogsResponse>('/api/v1/admin/audit-logs', { params });
    return res.data;
  },

  getSettings: async (): Promise<PlatformSettings> => {
    const res = await apiClient.get<PlatformSettings>('/api/v1/admin/settings');
    return res.data;
  },

  updateSettings: async (data: Partial<PlatformSettings>): Promise<PlatformSettings> => {
    const res = await apiClient.put<PlatformSettings>('/api/v1/admin/settings', data);
    return res.data;
  },

  getEmailSettings: async (): Promise<EmailSettings> => {
    const res = await apiClient.get<EmailSettings>('/api/v1/admin/settings/email');
    return res.data;
  },

  sendTestEmail: async (recipientEmail: string): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post<{ status: string; message: string }>('/api/v1/admin/settings/email/test', {
      recipient_email: recipientEmail,
    });
    return res.data;
  },

  registerBusiness: async (data: {
    business_name: string;
    owner_name: string;
    owner_email: string;
    password: string;
  }) => {
    const res = await apiClient.post('/api/v1/auth/register-business', data);
    return res.data;
  },

  completeSetup: async (data: { token: string; password: string }) => {
    const res = await apiClient.post('/api/v1/auth/complete-setup', data);
    return res.data;
  },
};
