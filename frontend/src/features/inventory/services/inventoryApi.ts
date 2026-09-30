import apiClient from '../../../services/api/client';
import {
  InventoryDashboard,
  LowStockReport,
  OpeningStockInput,
  Product,
  ProductCategory,
  ProductCategoryCreateInput,
  ProductCategoryUpdateInput,
  ProductCreateInput,
  ProductListResponse,
  ProductUpdateInput,
  StockAdjustmentInput,
  StockInInput,
  StockLedgerReport,
  StockMovement,
  StockOutInput,
  StockValueReport,
  Unit,
  UnitCreateInput,
  UnitUpdateInput,
} from '../types/inventory';

export const inventoryApi = {
  // Dashboard
  getDashboard: async (): Promise<InventoryDashboard> => {
    const res = await apiClient.get<InventoryDashboard>('/api/v1/inventory/dashboard');
    return res.data;
  },

  // Categories
  getCategories: async (includeInactive = true): Promise<ProductCategory[]> => {
    const res = await apiClient.get<ProductCategory[]>('/api/v1/inventory/categories', {
      params: { include_inactive: includeInactive },
    });
    return res.data;
  },

  createCategory: async (data: ProductCategoryCreateInput): Promise<ProductCategory> => {
    const res = await apiClient.post<ProductCategory>('/api/v1/inventory/categories', data);
    return res.data;
  },

  updateCategory: async (id: string, data: ProductCategoryUpdateInput): Promise<ProductCategory> => {
    const res = await apiClient.put<ProductCategory>(`/api/v1/inventory/categories/${id}`, data);
    return res.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/inventory/categories/${id}`);
  },

  // Units
  getUnits: async (includeInactive = true): Promise<Unit[]> => {
    const res = await apiClient.get<Unit[]>('/api/v1/inventory/units', {
      params: { include_inactive: includeInactive },
    });
    return res.data;
  },

  createUnit: async (data: UnitCreateInput): Promise<Unit> => {
    const res = await apiClient.post<Unit>('/api/v1/inventory/units', data);
    return res.data;
  },

  updateUnit: async (id: string, data: UnitUpdateInput): Promise<Unit> => {
    const res = await apiClient.put<Unit>(`/api/v1/inventory/units/${id}`, data);
    return res.data;
  },

  deleteUnit: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/inventory/units/${id}`);
  },

  // Products
  getProducts: async (params?: {
    search?: string;
    category_id?: string;
    is_active?: boolean;
    page?: number;
    skip?: number;
    limit?: number;
  }): Promise<ProductListResponse> => {
    const res = await apiClient.get<ProductListResponse>('/api/v1/inventory/products', { params });
    return res.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const res = await apiClient.get<Product>(`/api/v1/inventory/products/${id}`);
    return res.data;
  },

  createProduct: async (data: ProductCreateInput): Promise<Product> => {
    const res = await apiClient.post<Product>('/api/v1/inventory/products', data);
    return res.data;
  },

  updateProduct: async (id: string, data: ProductUpdateInput): Promise<Product> => {
    const res = await apiClient.put<Product>(`/api/v1/inventory/products/${id}`, data);
    return res.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/inventory/products/${id}`);
  },

  // Stock Actions
  createOpeningStock: async (data: OpeningStockInput): Promise<StockMovement> => {
    const res = await apiClient.post<StockMovement>('/api/v1/inventory/stock/opening', data);
    return res.data;
  },

  createStockIn: async (data: StockInInput): Promise<StockMovement> => {
    const res = await apiClient.post<StockMovement>('/api/v1/inventory/stock/in', data);
    return res.data;
  },

  createStockOut: async (data: StockOutInput): Promise<StockMovement> => {
    const res = await apiClient.post<StockMovement>('/api/v1/inventory/stock/out', data);
    return res.data;
  },

  createStockAdjustment: async (data: StockAdjustmentInput): Promise<StockMovement> => {
    const res = await apiClient.post<StockMovement>('/api/v1/inventory/stock/adjustment', data);
    return res.data;
  },

  getStockHistory: async (params?: {
    product_id?: string;
    movement_type?: string;
    date_from?: string;
    date_to?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: StockMovement[]; total: number }> => {
    const res = await apiClient.get<{ items: StockMovement[]; total: number }>('/api/v1/inventory/stock/history', { params });
    return res.data;
  },

  // Reports
  getReportStockLedger: async (productId: string, dateFrom?: string, dateTo?: string): Promise<StockLedgerReport> => {
    const res = await apiClient.get<StockLedgerReport>('/api/v1/inventory/reports/stock-ledger', {
      params: { product_id: productId, date_from: dateFrom, date_to: dateTo },
    });
    return res.data;
  },

  getReportStockValue: async (): Promise<StockValueReport> => {
    const res = await apiClient.get<StockValueReport>('/api/v1/inventory/reports/stock-value');
    return res.data;
  },

  getReportLowStock: async (): Promise<LowStockReport> => {
    const res = await apiClient.get<LowStockReport>('/api/v1/inventory/reports/low-stock');
    return res.data;
  },

  // Bulk Import
  importProducts: async (file: File): Promise<{
    total_rows: number;
    imported: number;
    skipped_duplicates: number;
    failed: number;
    errors: Array<{ row_number: number; product_name?: string; sku?: string; reason: string }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/api/v1/inventory/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  downloadImportTemplate: async (): Promise<void> => {
    const res = await apiClient.get('/api/v1/inventory/products/import-template', {
      responseType: 'blob',
    });
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products_import_template.csv');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      link.remove();
    }, 150);
  },
};

