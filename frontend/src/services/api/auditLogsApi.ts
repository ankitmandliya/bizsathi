import apiClient from './client';

export interface AuditLogItem {
  id: string;
  tenant_id: string;
  user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, { old: any; new: any }> | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PaginatedAuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogQueryParams {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const fetchAuditLogs = async (params: AuditLogQueryParams = {}): Promise<PaginatedAuditLogsResponse> => {
  const response = await apiClient.get<PaginatedAuditLogsResponse>('/api/v1/audit-logs', { params });
  return response.data;
};
