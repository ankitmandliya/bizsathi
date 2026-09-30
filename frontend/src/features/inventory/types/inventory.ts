export interface ProductCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryCreateInput {
  name: string;
  description?: string | null;
}

export interface ProductCategoryUpdateInput {
  name?: string | null;
  description?: string | null;
  is_active?: boolean | null;
}

export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  short_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitCreateInput {
  name: string;
  short_name?: string | null;
}

export interface UnitUpdateInput {
  name?: string | null;
  short_name?: string | null;
  is_active?: boolean | null;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string;
  category_id?: string | null;
  unit_id: string;
  description?: string | null;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
  current_stock: number;
  stock_status: 'Out of Stock' | 'Low Stock' | 'Normal';
  category_name?: string | null;
  unit_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCreateInput {
  name: string;
  sku: string;
  unit_id: string;
  category_id?: string | null;
  description?: string | null;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  opening_stock?: number | null;
}

export interface ProductUpdateInput {
  name?: string | null;
  sku?: string | null;
  unit_id?: string | null;
  category_id?: string | null;
  description?: string | null;
  purchase_price?: number | null;
  selling_price?: number | null;
  minimum_stock?: number | null;
  is_active?: boolean | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  movement_type: 'OPENING' | 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type?: string | null;
  reference_id?: string | null;
  movement_date: string;
  reason?: string | null;
  notes?: string | null;
  created_by_id?: string | null;
  created_at: string;
  product_name?: string | null;
  product_sku?: string | null;
}

export interface OpeningStockInput {
  product_id: string;
  quantity: number;
  notes?: string | null;
}

export interface StockInInput {
  product_id: string;
  quantity: number;
  unit_cost?: number | null;
  movement_date?: string | null;
  reason?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface StockOutInput {
  product_id: string;
  quantity: number;
  movement_date?: string | null;
  reason?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface StockAdjustmentInput {
  product_id: string;
  physical_count: number;
  reason: string;
  notes?: string | null;
}

export interface InventoryDashboard {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
  low_stock_products: Product[];
  recent_movements: StockMovement[];
}

export interface StockLedgerReport {
  product: Product;
  date_from?: string | null;
  date_to?: string | null;
  opening_balance: number;
  total_in: number;
  total_out: number;
  total_adjustment: number;
  closing_balance: number;
  movements: StockMovement[];
}

export interface StockValueReportItem {
  product_id: string;
  product_name?: string;
  name?: string;
  sku: string;
  category_name?: string | null;
  unit_name?: string | null;
  current_stock: number;
  purchase_price: number;
  selling_price: number;
  total_value?: number;
  stock_value?: number;
}

export interface StockValueReport {
  total_items?: number;
  total_products?: number;
  total_value?: number;
  total_stock_value?: number;
  items: StockValueReportItem[];
}


export interface LowStockReport {
  total_low_stock: number;
  total_out_of_stock: number;
  products: Product[];
}
