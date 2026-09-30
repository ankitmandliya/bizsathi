export type PresetFilter =
  | 'today'
  | 'this_week'
  | 'current_month'
  | 'last_month'
  | 'quarter_to_date'
  | 'year_to_date'
  | 'custom';

export type ReportCategory =
  | 'sales'
  | 'expenses'
  | 'customers'
  | 'vendors'
  | 'inventory'
  | 'hrm'
  | 'crm'
  | 'campaigns';

export interface SummaryCard {
  title: string;
  value: string;
  trend?: string;
  trend_is_positive?: boolean;
  subtitle?: string;
  icon?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ReportTableRow {
  id: string;
  columns: Record<string, any>;
  status_badge?: string;
  raw_id?: string;
}

export interface PaginatedReportTable {
  items: ReportTableRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BaseReportResponse {
  summary: SummaryCard[];
  table: PaginatedReportTable;
}

export interface SalesReportResponse extends BaseReportResponse {
  trend: ChartSeries;
  status_breakdown: ChartSeries;
}

export interface ExpensesReportResponse extends BaseReportResponse {
  trend: ChartSeries;
  category_breakdown: ChartSeries;
}

export interface CustomersReportResponse extends BaseReportResponse {
  top_customers_chart: ChartSeries;
}

export interface VendorsReportResponse extends BaseReportResponse {
  top_vendors_chart: ChartSeries;
}

export interface InventoryReportResponse extends BaseReportResponse {
  category_value_chart: ChartSeries;
  stock_status_chart: ChartSeries;
}

export interface HRMReportResponse extends BaseReportResponse {
  payroll_trend_chart: ChartSeries;
  leave_status_chart: ChartSeries;
}

export interface CRMReportResponse extends BaseReportResponse {
  lead_source_chart: ChartSeries;
  deal_pipeline_chart: ChartSeries;
}

export interface CampaignsReportResponse extends BaseReportResponse {
  roi_by_campaign_chart: ChartSeries;
  status_breakdown_chart: ChartSeries;
}

export interface ReportFilterParams {
  preset?: PresetFilter;
  start_date?: string;
  end_date?: string;
  status?: string;
  category?: string;
  customer_id?: string;
  vendor_id?: string;
  department?: string;
  stage_id?: string;
  low_stock_only?: boolean;
  page?: number;
  page_size?: number;
}
