import React, { useState, useEffect, useCallback } from 'react';
import {
  BaseReportResponse,
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
import { reportsApi } from '../services/reportsApi';
import { ReportSummaryCards } from '../components/ReportSummaryCards';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportCharts } from '../components/ReportCharts';
import { ReportTable } from '../components/ReportTable';
import { BarChart3, AlertCircle } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [category, setCategory] = useState<ReportCategory>('sales');
  const [filters, setFilters] = useState<ReportFilterParams>({
    preset: 'current_month',
    page: 1,
    page_size: 20,
  });

  const [reportData, setReportData] = useState<BaseReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeCategoryRef = React.useRef(category);

  useEffect(() => {
    activeCategoryRef.current = category;
  }, [category]);

  const fetchReport = useCallback(async () => {
    const reqCategory = category;
    setLoading(true);
    setError(null);
    try {
      let data: BaseReportResponse;
      switch (reqCategory) {
        case 'sales':
          data = await reportsApi.getSalesReport(filters);
          break;
        case 'expenses':
          data = await reportsApi.getExpensesReport(filters);
          break;
        case 'customers':
          data = await reportsApi.getCustomersReport(filters);
          break;
        case 'vendors':
          data = await reportsApi.getVendorsReport(filters);
          break;
        case 'inventory':
          data = await reportsApi.getInventoryReport(filters);
          break;
        case 'hrm':
          data = await reportsApi.getHrmReport(filters);
          break;
        case 'crm':
          data = await reportsApi.getCrmReport(filters);
          break;
        case 'campaigns':
          data = await reportsApi.getCampaignsReport(filters);
          break;
        default:
          data = await reportsApi.getSalesReport(filters);
      }
      if (activeCategoryRef.current === reqCategory) {
        setReportData(data);
      }
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      if (activeCategoryRef.current === reqCategory) {
        setReportData(null);
        setError(
          err.response?.data?.detail || 'Failed to load report metrics. Please check permissions or backend connection.'
        );
      }
    } finally {
      if (activeCategoryRef.current === reqCategory) {
        setLoading(false);
      }
    }
  }, [category, filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleCategoryChange = (newCat: ReportCategory) => {
    activeCategoryRef.current = newCat;
    setCategory(newCat);
    setReportData(null);
    setError(null);
    setFilters({
      preset: 'current_month',
      page: 1,
      page_size: 20,
    });
  };

  const handleFilterChange = (newFilters: Partial<ReportFilterParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      preset: 'current_month',
      page: 1,
      page_size: 20,
    });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await reportsApi.exportReportCsv(category, filters);
    } catch (err: any) {
      console.error('CSV Export failed:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const renderCategoryCharts = () => {
    if (!reportData) return null;

    if (category === 'sales') {
      const sales = reportData as SalesReportResponse;
      return (
        <ReportCharts
          primaryChart={sales.trend}
          primaryTitle="Monthly Sales Trend (₹)"
          primaryType="line"
          secondaryChart={sales.status_breakdown}
          secondaryTitle="Invoice Status Breakdown"
          secondaryType="donut"
        />
      );
    }

    if (category === 'expenses') {
      const exp = reportData as ExpensesReportResponse;
      return (
        <ReportCharts
          primaryChart={exp.trend}
          primaryTitle="Expense Volume Trend (₹)"
          primaryType="line"
          secondaryChart={exp.category_breakdown}
          secondaryTitle="Expenses by Category"
          secondaryType="donut"
        />
      );
    }

    if (category === 'customers') {
      const cust = reportData as CustomersReportResponse;
      return (
        <ReportCharts
          primaryChart={cust.top_customers_chart}
          primaryTitle="Top Customers by Revenue (₹)"
          primaryType="bar"
        />
      );
    }

    if (category === 'vendors') {
      const vend = reportData as VendorsReportResponse;
      return (
        <ReportCharts
          primaryChart={vend.top_vendors_chart}
          primaryTitle="Top Vendors by Spend (₹)"
          primaryType="bar"
        />
      );
    }

    if (category === 'inventory') {
      const inv = reportData as InventoryReportResponse;
      return (
        <ReportCharts
          primaryChart={inv.category_value_chart}
          primaryTitle="Inventory Valuation by Category (₹)"
          primaryType="bar"
          secondaryChart={inv.stock_status_chart}
          secondaryTitle="Stock Health Status"
          secondaryType="donut"
        />
      );
    }

    if (category === 'hrm') {
      const hrm = reportData as HRMReportResponse;
      return (
        <ReportCharts
          primaryChart={hrm.payroll_trend_chart}
          primaryTitle="Payroll Expenditure Trend (₹)"
          primaryType="line"
          secondaryChart={hrm.leave_status_chart}
          secondaryTitle="Leave Requests Status"
          secondaryType="donut"
        />
      );
    }

    if (category === 'crm') {
      const crm = reportData as CRMReportResponse;
      return (
        <ReportCharts
          primaryChart={crm.deal_pipeline_chart}
          primaryTitle="Deal Value by Stage (₹)"
          primaryType="bar"
          secondaryChart={crm.lead_source_chart}
          secondaryTitle="Leads by Source"
          secondaryType="donut"
        />
      );
    }

    if (category === 'campaigns') {
      const camp = reportData as CampaignsReportResponse;
      return (
        <ReportCharts
          primaryChart={camp.roi_by_campaign_chart}
          primaryTitle="Top Campaigns ROI (%)"
          primaryType="bar"
          secondaryChart={camp.status_breakdown_chart}
          secondaryTitle="Campaign Status Distribution"
          secondaryType="donut"
        />
      );
    }

    return null;
  };

  return (
    <div className="reports-page">
      {/* Header Card */}
      <div className="reports-header-card">
        <div>
          <div className="reports-header-title">
            <BarChart3 size={26} style={{ color: 'var(--primary)' }} />
            <span>Executive Reports & Analytics</span>
          </div>
          <div className="reports-header-sub">
            Real-time multi-tenant aggregate intelligence, financial reporting, and CSV exports.
          </div>
        </div>
      </div>

      {/* Filter Bar with Category Tabs */}
      <ReportFilterBar
        activeCategory={category}
        onCategoryChange={handleCategoryChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onExport={handleExportCsv}
        exporting={exporting}
      />

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger-text)', fontSize: '13px', fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <ReportSummaryCards cards={reportData?.summary || []} loading={loading} />

      {/* Visual SVG Charts */}
      {!loading && renderCategoryCharts()}

      {/* Filter-Aware Paginated Data Table */}
      <ReportTable
        table={reportData?.table}
        loading={loading}
        onPageChange={handlePageChange}
        title={`${category.toUpperCase()} Detailed Records`}
      />
    </div>
  );
};
