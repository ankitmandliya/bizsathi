import apiClient from '../../../services/api/client';

export interface ExpenseCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryCreateInput {
  name: string;
  description?: string | null;
}

export interface ExpenseCategoryUpdateInput {
  name?: string | null;
  description?: string | null;
  is_active?: boolean | null;
}

export interface Expense {
  id: string;
  tenant_id: string;
  category_id: string;
  category_name: string;
  title: str;
  description?: string | null;
  amount: number;
  expense_date: string;
  payment_method: 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'OTHER';
  vendor_name?: string | null;
  reference_number?: string | null;
  receipt_url?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreateInput {
  category_id: string;
  title: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  payment_method: 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'OTHER';
  vendor_name?: string | null;
  reference_number?: string | null;
  receipt_url?: string | null;
}

export interface PaginatedExpensesResponse {
  items: Expense[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ExpenseSummaryResponse {
  total_expense: number;
  expense_count: number;
  category_breakdown: CategoryBreakdownItem[];
}

export interface ExpenseFilters {
  from_date?: string;
  to_date?: string;
  category_id?: string;
  payment_method?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export const expensesApi = {
  // Categories
  getCategories: async (includeInactive = true): Promise<ExpenseCategory[]> => {
    const response = await apiClient.get('/api/v1/expense-categories', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  createCategory: async (data: ExpenseCategoryCreateInput): Promise<ExpenseCategory> => {
    const response = await apiClient.post('/api/v1/expense-categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: ExpenseCategoryUpdateInput): Promise<ExpenseCategory> => {
    const response = await apiClient.put(`/api/v1/expense-categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expense-categories/${id}`);
  },

  // Expenses
  getExpenses: async (filters: ExpenseFilters = {}): Promise<PaginatedExpensesResponse> => {
    const response = await apiClient.get('/api/v1/expenses', { params: filters });
    return response.data;
  },

  getExpenseSummary: async (filters: ExpenseFilters = {}): Promise<ExpenseSummaryResponse> => {
    const { page, page_size, ...summaryParams } = filters;
    const response = await apiClient.get('/api/v1/expenses/summary', { params: summaryParams });
    return response.data;
  },

  getExpense: async (id: string): Promise<Expense> => {
    const response = await apiClient.get(`/api/v1/expenses/${id}`);
    return response.data;
  },

  createExpense: async (data: ExpenseCreateInput): Promise<Expense> => {
    const response = await apiClient.post('/api/v1/expenses', data);
    return response.data;
  },

  updateExpense: async (id: string, data: Partial<ExpenseCreateInput>): Promise<Expense> => {
    const response = await apiClient.put(`/api/v1/expenses/${id}`, data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/${id}`);
  },

  uploadReceipt: async (file: File): Promise<{ receipt_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/v1/expenses/upload-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
