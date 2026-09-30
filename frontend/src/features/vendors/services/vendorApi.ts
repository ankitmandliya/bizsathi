import apiClient from '../../../services/api/client';
import {
  PaginatedVendorsResponse,
  Vendor,
  VendorCreateInput,
  VendorImportSummaryResponse,
  VendorUpdateInput,
} from '../types/vendor';

export const vendorApi = {
  getVendors: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedVendorsResponse> => {
    const res = await apiClient.get<PaginatedVendorsResponse>('/api/v1/vendors', { params });
    return res.data;
  },

  getVendor: async (id: string): Promise<Vendor> => {
    const res = await apiClient.get<Vendor>(`/api/v1/vendors/${id}`);
    return res.data;
  },

  createVendor: async (data: VendorCreateInput): Promise<Vendor> => {
    const res = await apiClient.post<Vendor>('/api/v1/vendors', data);
    return res.data;
  },

  updateVendor: async (id: string, data: VendorUpdateInput): Promise<Vendor> => {
    const res = await apiClient.put<Vendor>(`/api/v1/vendors/${id}`, data);
    return res.data;
  },

  deleteVendor: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/vendors/${id}`);
  },

  importVendors: async (file: File): Promise<VendorImportSummaryResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<VendorImportSummaryResponse>('/api/v1/vendors/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  downloadImportTemplate: async (): Promise<void> => {
    const res = await apiClient.get('/api/v1/vendors/import-template', {
      responseType: 'blob',
    });
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'vendors_import_template.csv');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      link.remove();
    }, 150);
  },
};
