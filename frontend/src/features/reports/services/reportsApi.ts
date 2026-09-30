import apiClient from '../../../services/api/client';
import {
  CampaignsReportResponse,
  CRMReportResponse,
  CustomersReportResponse,
  ExpensesReportResponse,
  HRMReportResponse,
  InventoryReportResponse,
  ReportCategory,
  ReportFilterParams,
  SalesReportResponse,
  VendorsReportResponse,
} from '../types/report';

export const reportsApi = {
  getSalesReport: async (params?: ReportFilterParams): Promise<SalesReportResponse> => {
    const res = await apiClient.get<SalesReportResponse>('/api/v1/reports/sales', { params });
    return res.data;
  },

  getExpensesReport: async (params?: ReportFilterParams): Promise<ExpensesReportResponse> => {
    const res = await apiClient.get<ExpensesReportResponse>('/api/v1/reports/expenses', { params });
    return res.data;
  },

  getCustomersReport: async (params?: ReportFilterParams): Promise<CustomersReportResponse> => {
    const res = await apiClient.get<CustomersReportResponse>('/api/v1/reports/customers', { params });
    return res.data;
  },

  getVendorsReport: async (params?: ReportFilterParams): Promise<VendorsReportResponse> => {
    const res = await apiClient.get<VendorsReportResponse>('/api/v1/reports/vendors', { params });
    return res.data;
  },

  getInventoryReport: async (params?: ReportFilterParams): Promise<InventoryReportResponse> => {
    const res = await apiClient.get<InventoryReportResponse>('/api/v1/reports/inventory', { params });
    return res.data;
  },

  getHrmReport: async (params?: ReportFilterParams): Promise<HRMReportResponse> => {
    const res = await apiClient.get<HRMReportResponse>('/api/v1/reports/hrm', { params });
    return res.data;
  },

  getCrmReport: async (params?: ReportFilterParams): Promise<CRMReportResponse> => {
    const res = await apiClient.get<CRMReportResponse>('/api/v1/reports/crm', { params });
    return res.data;
  },

  getCampaignsReport: async (params?: ReportFilterParams): Promise<CampaignsReportResponse> => {
    const res = await apiClient.get<CampaignsReportResponse>('/api/v1/reports/campaigns', { params });
    return res.data;
  },

  exportReportCsv: async (category: ReportCategory, params?: ReportFilterParams): Promise<void> => {
    const { page, page_size, ...exportParams } = params || {};
    const res = await apiClient.get(`/api/v1/reports/${category}/export`, {
      params: exportParams,
      responseType: 'blob',
    });
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${category}_report.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      link.remove();
    }, 150);
  },
};
