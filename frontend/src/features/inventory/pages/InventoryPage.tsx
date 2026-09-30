import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  AlertTriangle,
  TrendingDown,
  Layers,
  Scale,
  RefreshCw,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  History,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Upload,
  X,
  Filter,
} from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi';
import {
  InventoryDashboard,
  Product,
  ProductCategory,
  StockMovement,
  StockValueReport,
  Unit,
} from '../types/inventory';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductImportModal } from '../components/ProductImportModal';
import { StockMovementModal } from '../components/StockMovementModal';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { UnitFormModal } from '../components/UnitFormModal';
import { AuditLogButton } from '../../../components/common/AuditLogButton';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

const PaginationControls: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'records',
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--panel-alt)',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1.5px solid var(--line)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
          Showing <strong style={{ color: 'var(--text)' }}>{startItem}–{endItem}</strong> of <strong style={{ color: 'var(--text)' }}>{totalItems}</strong> {itemLabel}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
          style={{
            padding: '6px 9px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            color: currentPage <= 1 ? 'var(--muted)' : 'var(--text)',
            opacity: currentPage <= 1 ? 0.4 : 1,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous Page"
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            color: currentPage <= 1 ? 'var(--muted)' : 'var(--text)',
            opacity: currentPage <= 1 ? 0.4 : 1,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {getPageNumbers().map((pg, idx) => {
            if (typeof pg === 'string') {
              return (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--muted)', fontSize: '12px' }}>
                  ...
                </span>
              );
            }
            const isCurrent = pg === currentPage;
            return (
              <button
                key={pg}
                type="button"
                onClick={() => onPageChange(pg)}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: isCurrent ? '1.5px solid #4f46e5' : '1px solid var(--line)',
                  background: isCurrent ? '#4f46e5' : 'var(--bg-card)',
                  color: isCurrent ? '#ffffff' : 'var(--text)',
                  fontWeight: isCurrent ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isCurrent ? '0 2px 4px rgba(79, 70, 229, 0.25)' : 'none',
                }}
              >
                {pg}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next Page"
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            color: currentPage >= totalPages ? 'var(--muted)' : 'var(--text)',
            opacity: currentPage >= totalPages ? 0.4 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Next <ChevronRight size={14} />
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
          style={{
            padding: '6px 9px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            color: currentPage >= totalPages ? 'var(--muted)' : 'var(--text)',
            opacity: currentPage >= totalPages ? 0.4 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'movements' | 'categories' | 'reports'>('dashboard');

  const [dashboardData, setDashboardData] = useState<InventoryDashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalMovementsCountState, setTotalMovementsCountState] = useState(0);
  const [valuationReport, setValuationReport] = useState<StockValueReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'NORMAL' | 'LOW' | 'OUT'>('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  // Pagination states
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);

  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(10);

  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(10);

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<ProductCategory | null>(null);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [selectedUnitForEdit, setSelectedUnitForEdit] = useState<Unit | null>(null);

  const loadMovements = useCallback(async () => {
    try {
      const res = await inventoryApi.getStockHistory({
        movement_type: movementTypeFilter || undefined,
        page: movementPage,
        limit: movementPageSize,
      });
      setMovements(res.items || []);
      setTotalMovementsCountState(res.total || 0);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
      setMovements([]);
      setTotalMovementsCountState(0);
    }
  }, [movementTypeFilter, movementPage, movementPageSize]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dash, cats, unts, prodsRes, movesRes, valRes] = await Promise.all([
        inventoryApi.getDashboard().catch(() => null),
        inventoryApi.getCategories().catch(() => []),
        inventoryApi.getUnits().catch(() => []),
        inventoryApi.getProducts({ limit: 100 }).catch((err) => {
          console.error('Error fetching products:', err);
          return { items: [], total: 0 };
        }),
        inventoryApi.getStockHistory({ limit: movementPageSize }).catch((err) => {
          console.error('Error fetching stock history:', err);
          return { items: [], total: 0 };
        }),
        inventoryApi.getReportStockValue().catch(() => null),
      ]);

      setDashboardData(dash);
      setCategories(cats);
      setUnits(unts);
      setProducts(prodsRes.items);
      setTotalProductsCount(prodsRes.total);
      setMovements(movesRes.items || []);
      setTotalMovementsCountState(movesRes.total || movesRes.items?.length || 0);
      setValuationReport(valRes);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadMovements();
    }
  }, [activeTab, loadMovements]);

  const handleProductSubmit = async (data: any) => {
    if (selectedProductForEdit) {
      await inventoryApi.updateProduct(selectedProductForEdit.id, data);
    } else {
      await inventoryApi.createProduct(data);
    }
    await loadAllData();
    if (activeTab === 'movements') {
      await loadMovements();
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      await inventoryApi.deleteProduct(id);
      await loadAllData();
      if (activeTab === 'movements') {
        await loadMovements();
      }
    }
  };

  const handleMovementSubmit = async (data: any) => {
    if (movementType === 'IN') {
      await inventoryApi.createStockIn(data);
    } else if (movementType === 'OUT') {
      await inventoryApi.createStockOut(data);
    } else {
      await inventoryApi.createStockAdjustment(data);
    }
    await loadAllData();
    await loadMovements();
  };

  const handleCategorySubmit = async (data: any) => {
    if (selectedCategoryForEdit) {
      await inventoryApi.updateCategory(selectedCategoryForEdit.id, data);
    } else {
      await inventoryApi.createCategory(data);
    }
    await loadAllData();
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Delete category "${name}"?`)) {
      await inventoryApi.deleteCategory(id);
      await loadAllData();
    }
  };

  const handleUnitSubmit = async (data: any) => {
    if (selectedUnitForEdit) {
      await inventoryApi.updateUnit(selectedUnitForEdit.id, data);
    } else {
      await inventoryApi.createUnit(data);
    }
    await loadAllData();
  };

  const handleDeleteUnit = async (id: string, name: string) => {
    if (window.confirm(`Delete unit "${name}"?`)) {
      await inventoryApi.deleteUnit(id);
      await loadAllData();
    }
  };

  const openStockModal = (type: 'IN' | 'OUT' | 'ADJUSTMENT', product?: Product) => {
    setMovementType(type);
    setSelectedProductForMovement(product || null);
    setMovementModalOpen(true);
  };

  // Filter handlers with page reset
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setProductPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setProductPage(1);
  };

  const handleStatusChange = (val: 'ALL' | 'NORMAL' | 'LOW' | 'OUT') => {
    setSelectedStatus(val);
    setProductPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedStatus('ALL');
    setProductPage(1);
  };

  // Products filtering & pagination
  const filteredProducts = (products || []).filter((p) => {
    const matchesSearch =
      !search ||
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || p.category_id === selectedCategory;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'NORMAL' && p.stock_status === 'Normal') ||
      (selectedStatus === 'LOW' && p.stock_status === 'Low Stock') ||
      (selectedStatus === 'OUT' && p.stock_status === 'Out of Stock');
    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalFilteredProducts = filteredProducts.length;
  const totalProductPages = Math.ceil(totalFilteredProducts / productPageSize) || 1;
  const currentProductPage = Math.min(productPage, totalProductPages);
  const startProductIdx = (currentProductPage - 1) * productPageSize;
  const paginatedProducts = filteredProducts.slice(startProductIdx, startProductIdx + productPageSize);

  // Stock valuation fallback across products catalog
  const calculatedStockValue = (products || []).reduce(
    (sum, p) => sum + (Number(p.current_stock) || 0) * (Number(p.purchase_price) || 0),
    0
  );
  const displayTotalStockValue =
    dashboardData?.total_stock_value && Number(dashboardData.total_stock_value) > 0
      ? Number(dashboardData.total_stock_value)
      : valuationReport?.total_stock_value && Number(valuationReport.total_stock_value) > 0
      ? Number(valuationReport.total_stock_value)
      : calculatedStockValue;

  // Dashboard counter & list fallbacks from products catalog and movements state
  const calculatedLowStockCount = (products || []).filter((p) => {
    const stock = Number(p.current_stock) || 0;
    const minStock = Number(p.minimum_stock) || 0;
    return stock > 0 && stock <= minStock;
  }).length;

  const calculatedOutOfStockCount = (products || []).filter((p) => {
    const stock = Number(p.current_stock) || 0;
    return stock === 0;
  }).length;

  const displayLowStockCount =
    dashboardData?.low_stock_count !== undefined && dashboardData?.low_stock_count !== null
      ? dashboardData.low_stock_count
      : calculatedLowStockCount;

  const displayOutOfStockCount =
    dashboardData?.out_of_stock_count !== undefined && dashboardData?.out_of_stock_count !== null
      ? dashboardData.out_of_stock_count
      : calculatedOutOfStockCount;

  const displayLowStockProducts =
    dashboardData?.low_stock_products && dashboardData.low_stock_products.length > 0
      ? dashboardData.low_stock_products
      : (products || [])
          .filter((p) => {
            const stock = Number(p.current_stock) || 0;
            const minStock = Number(p.minimum_stock) || 0;
            return stock <= minStock;
          })
          .map((p) => ({
            ...p,
            stock_status: (Number(p.current_stock) || 0) === 0 ? 'Out of Stock' : 'Low Stock',
          }));

  const displayRecentMovements =
    dashboardData?.recent_movements && dashboardData.recent_movements.length > 0
      ? dashboardData.recent_movements
      : movements.slice(0, 7);

  // Movements filtering & pagination (Server-side paginated via API)
  const totalMovementsCount = totalMovementsCountState;
  const totalMovementPages = Math.ceil(totalMovementsCount / movementPageSize) || 1;
  const currentMovementPage = Math.min(movementPage, totalMovementPages);
  const paginatedMovements = movements;

  // Valuation Reports pagination
  const valuationItems =
    valuationReport?.items && valuationReport.items.length > 0
      ? valuationReport.items
      : (products || []).map((p) => ({
          product_id: p.id,
          product_name: p.name,
          name: p.name,
          sku: p.sku,
          unit_name: p.unit?.name || 'pc',
          current_stock: p.current_stock || 0,
          purchase_price: p.purchase_price || 0,
          selling_price: p.selling_price || 0,
          total_value: (Number(p.current_stock) || 0) * (Number(p.purchase_price) || 0),
        }));
  const totalReportsCount = valuationItems.length;
  const totalReportPages = Math.ceil(totalReportsCount / reportPageSize) || 1;
  const currentReportPage = Math.min(reportPage, totalReportPages);
  const startReportIdx = (currentReportPage - 1) * reportPageSize;
  const paginatedValuationItems = valuationItems.slice(startReportIdx, startReportIdx + reportPageSize);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);
  const isFilterActive = !!search || !!selectedCategory || selectedStatus !== 'ALL';

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Inventory & Stock Management
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '99px',
                background: '#e0e7ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
              }}
            >
              V1 Layer
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
            Real-time stock ledger, minimum reorder alerts, movement logs & valuation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadAllData()}
            style={{
              padding: '10px',
              borderRadius: '10px',
              background: 'var(--panel-alt)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => openStockModal('IN')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              color: '#047857',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDownRight size={16} /> Stock In
          </button>

          <button
            type="button"
            onClick={() => openStockModal('OUT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              color: '#b45309',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUpRight size={16} /> Stock Out
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'var(--panel-alt)',
              border: '1.5px solid var(--line)',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Upload size={16} /> Import Products
          </button>

          <AuditLogButton
            entityTypes={['product', 'product_category', 'unit', 'stock_movement', 'product_import']}
            title="Inventory Audit Log"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'var(--panel-alt)',
              border: '1.5px solid var(--line)',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          />

          <button
            type="button"
            onClick={() => {
              setSelectedProductForEdit(null);
              setProductModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Stock Value */}
        <div
          onClick={() => setActiveTab('reports')}
          title="Click to view Valuation Reports"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            borderRadius: '16px',
            padding: '20px',
            color: '#ffffff',
            boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.85, margin: 0 }}>Total Stock Value</p>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>
            ₹{Number(displayTotalStockValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p style={{ fontSize: '11px', opacity: 0.75, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> Valuation based on cost price
          </p>
        </div>

        {/* Card 2: Total Items */}
        <div
          onClick={() => {
            handleClearFilters();
            setActiveTab('products');
          }}
          title="Click to view All Products Catalog"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Total Catalog Items</p>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0', color: 'var(--text)' }}>
            {dashboardData?.total_products ?? totalProductsCount}
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0' }}>
            Across {categories.length} categories
          </p>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div
          onClick={() => {
            handleStatusChange('LOW');
            setActiveTab('products');
          }}
          title="Click to view Low Stock Products"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Low Stock Reorders</p>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0', color: '#d97706' }}>
            {displayLowStockCount}
          </h3>
          <p style={{ fontSize: '11px', color: '#b45309', margin: '4px 0 0' }}>
            Below minimum reorder threshold
          </p>
        </div>

        {/* Card 4: Out of Stock */}
        <div
          onClick={() => {
            handleStatusChange('OUT');
            setActiveTab('products');
          }}
          title="Click to view Out of Stock Products"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Out of Stock Items</p>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0', color: '#dc2626' }}>
            {displayOutOfStockCount}
          </h3>
          <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>
            Zero current stock balance
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid var(--line)', paddingBottom: '4px', overflowX: 'auto' }}>
        {[
          { id: 'dashboard', label: 'Overview', icon: BarChart3 },
          { id: 'products', label: `Products Catalog (${filteredProducts.length})`, icon: Package },
          { id: 'movements', label: 'Stock Movements Log', icon: History },
          { id: 'categories', label: 'Categories & Units', icon: Layers },
          { id: 'reports', label: 'Valuation Reports', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: isActive ? '#e0e7ff' : 'transparent',
                color: isActive ? '#4338ca' : 'var(--muted)',
                border: isActive ? '1.5px solid #c7d2fe' : '1.5px solid transparent',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Low Stock Alerts Table */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                  <AlertTriangle size={18} color="#d97706" /> Stock Reorder Alerts
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Products requiring inventory replenishment
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View all catalog <ChevronRight size={14} />
              </button>
            </div>

            {!displayLowStockProducts || displayLowStockProducts.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--line)', borderRadius: '12px' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Stock Levels Healthy</p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>No products are currently below minimum stock threshold.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Product Name</th>
                      <th style={{ padding: '10px 12px' }}>SKU</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Available</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Min Level</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLowStockProducts.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--muted)' }}>{p.sku}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                          {p.current_stock} {p.unit_name || ''}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--muted)' }}>{p.minimum_stock}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '99px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: p.stock_status === 'Out of Stock' ? '#fee2e2' : '#fef3c7',
                              color: p.stock_status === 'Out of Stock' ? '#b91c1c' : '#b45309',
                            }}
                          >
                            {p.stock_status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => openStockModal('IN', p as any)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#047857',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            + Reorder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Movement Log Stream */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
              <History size={18} color="#4f46e5" /> Recent Ledger Logs
            </h3>

            {!displayRecentMovements || displayRecentMovements.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No recent movements recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayRecentMovements.slice(0, 7).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--panel-alt)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: m.movement_type === 'IN' || m.movement_type === 'OPENING' ? '#dcfce7' : m.movement_type === 'OUT' ? '#fef3c7' : '#e0e7ff',
                          color: m.movement_type === 'IN' || m.movement_type === 'OPENING' ? '#15803d' : m.movement_type === 'OUT' ? '#b45309' : '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {m.movement_type === 'IN' || m.movement_type === 'OPENING' ? (
                          <ArrowDownRight size={14} />
                        ) : m.movement_type === 'OUT' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <Sliders size={14} />
                        )}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{m.product_name || 'Item'}</p>
                        <p style={{ fontSize: '10px', color: 'var(--muted)', margin: '2px 0 0' }}>
                          {m.reason || m.reference_type || 'Adjustment'} • {new Date(m.movement_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        color: m.movement_type === 'IN' || m.movement_type === 'OPENING' ? '#16a34a' : m.movement_type === 'OUT' ? '#d97706' : '#4f46e5',
                      }}
                    >
                      {m.movement_type === 'OUT' ? `-${m.quantity}` : `+${m.quantity}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS CATALOG */}
      {activeTab === 'products' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '0', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
          {/* Controls Bar Header */}
          <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: isFilterActive ? 'none' : '1px solid var(--line)' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search products by name or SKU..."
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 36px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="NORMAL">Normal Stock</option>
                <option value="LOW">Low Stock Alert</option>
                <option value="OUT">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Active Filter Strip */}
          {isFilterActive && (
            <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={12} /> Active Filters:
              </span>
              {search && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Query: "{search}"
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleSearchChange('')} />
                </span>
              )}
              {selectedCategory && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: '#f3e8ff', color: '#6b21a8', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Category: {selectedCategoryObj?.name || 'Selected'}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleCategoryChange('')} />
                </span>
              )}
              {selectedStatus !== 'ALL' && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: selectedStatus === 'OUT' ? '#fee2e2' : selectedStatus === 'LOW' ? '#fef3c7' : '#dcfce7', color: selectedStatus === 'OUT' ? '#b91c1c' : selectedStatus === 'LOW' ? '#b45309' : '#15803d', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status: {selectedStatus === 'NORMAL' ? 'Normal Stock' : selectedStatus === 'LOW' ? 'Low Stock Alert' : 'Out of Stock'}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleStatusChange('ALL')} />
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '11px', cursor: 'pointer', padding: '2px 6px' }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Table */}
          {filteredProducts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', borderRadius: '12px', margin: '24px' }}>
              <Package size={36} color="var(--muted)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>No products found</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>Try adjusting search filters or add a new product.</p>
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 16px' }}>Product</th>
                    <th style={{ padding: '14px 16px' }}>SKU</th>
                    <th style={{ padding: '14px 16px' }}>Category</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Cost (₹)</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Price (₹)</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Current Stock</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p) => (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)', maxWidth: '260px' }}>
                        <div>{p.name}</div>
                        {p.description && <p style={{ fontSize: '11px', fontWeight: 400, color: 'var(--muted)', margin: '3px 0 0', lineHeight: 1.3 }}>{p.description}</p>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '12px', fontWeight: 600, background: 'var(--panel-alt)', padding: '3px 8px', borderRadius: '6px', color: 'var(--text)', border: '1px solid var(--line)' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text)', fontWeight: 500 }}>
                        {p.category_name || 'Uncategorized'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted)', fontWeight: 500 }}>
                        ₹{Number(p.purchase_price || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>
                        ₹{Number(p.selling_price || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text)', fontSize: '14px' }}>
                        {Number(p.current_stock || 0)}{' '}
                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)' }}>{p.unit_name || ''}</span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '99px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-block',
                            background:
                              p.stock_status === 'Out of Stock'
                                ? '#fee2e2'
                                : p.stock_status === 'Low Stock'
                                ? '#fef3c7'
                                : '#dcfce7',
                            border:
                              p.stock_status === 'Out of Stock'
                                ? '1px solid #fecaca'
                                : p.stock_status === 'Low Stock'
                                ? '1px solid #fde68a'
                                : '1px solid #bbf7d0',
                            color:
                              p.stock_status === 'Out of Stock'
                                ? '#b91c1c'
                                : p.stock_status === 'Low Stock'
                                ? '#b45309'
                                : '#15803d',
                          }}
                        >
                          {p.stock_status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => openStockModal('IN', p)}
                          style={{ padding: '5px 10px', borderRadius: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: 700, fontSize: '11px', cursor: 'pointer', marginRight: '4px', transition: 'all 0.15s ease' }}
                        >
                          +In
                        </button>
                        <button
                          type="button"
                          onClick={() => openStockModal('OUT', p)}
                          style={{ padding: '5px 10px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 700, fontSize: '11px', cursor: 'pointer', marginRight: '4px', transition: 'all 0.15s ease' }}
                        >
                          -Out
                        </button>
                        <button
                          type="button"
                          onClick={() => openStockModal('ADJUSTMENT', p)}
                          style={{ padding: '5px 10px', borderRadius: '6px', background: '#e0e7ff', border: '1px solid #c7d2fe', color: '#4338ca', fontWeight: 700, fontSize: '11px', cursor: 'pointer', marginRight: '6px', transition: 'all 0.15s ease' }}
                        >
                          Adj
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductForEdit(p);
                            setProductModalOpen(true);
                          }}
                          style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginRight: '2px', borderRadius: '6px' }}
                          title="Edit product"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px' }}
                          title="Delete product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Products Table Pagination Footer */}
          {filteredProducts.length > 0 && (
            <PaginationControls
              currentPage={currentProductPage}
              totalPages={totalProductPages}
              pageSize={productPageSize}
              totalItems={totalFilteredProducts}
              onPageChange={(pg) => setProductPage(pg)}
              onPageSizeChange={(sz) => {
                setProductPageSize(sz);
                setProductPage(1);
              }}
              itemLabel="products"
            />
          )}
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENTS LOG */}
      {activeTab === 'movements' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '0', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--line)' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Audit Stock Ledger Transactions
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>Real-time movement logs, purchases, dispatches & inventory adjustments</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementTypeFilter(e.target.value);
                  setMovementPage(1);
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="">All Movement Types</option>
                <option value="OPENING">OPENING Stock</option>
                <option value="IN">IN (Purchases / Reversals)</option>
                <option value="OUT">OUT (Sales / Dispatches)</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>

              <button
                type="button"
                onClick={() => openStockModal('IN')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <ArrowDownRight size={14} /> Stock In
              </button>
              <button
                type="button"
                onClick={() => openStockModal('OUT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <ArrowUpRight size={14} /> Stock Out
              </button>
              <button
                type="button"
                onClick={() => openStockModal('ADJUSTMENT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#e0e7ff',
                  border: '1px solid #c7d2fe',
                  color: '#4338ca',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Sliders size={14} /> Adjustment
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>Type</th>
                  <th style={{ padding: '14px 16px' }}>Product</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Cost</th>
                  <th style={{ padding: '14px 16px' }}>Reason / Reference</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)' }}>
                      <History size={36} color="var(--muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>No stock ledger transactions found</p>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 16px' }}>Record a Stock In, Stock Out, or Inventory Adjustment to populate ledger history.</p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => openStockModal('IN')}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                        >
                          + Record Stock In
                        </button>
                        <button
                          type="button"
                          onClick={() => openStockModal('OUT')}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                        >
                          - Record Stock Out
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(m.movement_date).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '99px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-block',
                            background:
                              m.movement_type === 'IN' || m.movement_type === 'OPENING'
                                ? '#dcfce7'
                                : m.movement_type === 'OUT'
                                ? '#fef3c7'
                                : '#e0e7ff',
                            color:
                              m.movement_type === 'IN' || m.movement_type === 'OPENING'
                                ? '#15803d'
                                : m.movement_type === 'OUT'
                                ? '#b45309'
                                : '#4338ca',
                          }}
                        >
                          {m.movement_type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>
                        {m.product_name} <span style={{ fontFamily: 'monospace', fontWeight: 400, color: 'var(--muted)' }}>({m.product_sku})</span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800 }}>
                        {m.movement_type === 'OUT' ? `-${m.quantity}` : `+${m.quantity}`}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted)' }}>
                        ₹{Number(m.unit_cost || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                        ₹{Number(m.total_cost || 0).toFixed(2)}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text)' }}>
                        {m.reason || m.reference_type || '—'}
                        {m.notes && <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>{m.notes}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalMovementsCount > 0 && (
            <PaginationControls
              currentPage={currentMovementPage}
              totalPages={totalMovementPages}
              pageSize={movementPageSize}
              totalItems={totalMovementsCount}
              onPageChange={(pg) => setMovementPage(pg)}
              onPageSizeChange={(sz) => {
                setMovementPageSize(sz);
                setMovementPage(1);
              }}
              itemLabel="movements"
            />
          )}
        </div>
      )}

      {/* TAB 4: CATEGORIES & UNITS */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Categories Card */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                  <Layers size={18} color="#8b5cf6" /> Product Categories ({categories.length})
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>Group catalog items for targeted filtering</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryForEdit(null);
                  setCategoryModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#f3e8ff',
                  border: '1px solid #d8b4fe',
                  color: '#6b21a8',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Add Category
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--panel-alt)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{c.name}</p>
                    {c.description && <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>{c.description}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryForEdit(c);
                        setCategoryModalOpen(true);
                      }}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Units Card */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                  <Scale size={18} color="#0284c7" /> Units of Measurement ({units.length})
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>Standard and custom units for stock tracking</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUnitForEdit(null);
                  setUnitModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  border: '1px solid #7dd3fc',
                  color: '#0369a1',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Add Unit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {units.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--panel-alt)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{u.name}</p>
                    <p style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted)', margin: '2px 0 0' }}>Code: {u.short_name || u.name}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUnitForEdit(u);
                        setUnitModalOpen(true);
                      }}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUnit(u.id, u.name)}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: VALUATION REPORTS */}
      {activeTab === 'reports' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', padding: '0', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Inventory Valuation Summary
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>Calculated value of current stock holding</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Total Asset Value:</span>
              <p style={{ fontSize: '22px', fontWeight: 800, color: '#4f46e5', margin: '2px 0 0' }}>
                ₹{Number(displayTotalStockValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {!valuationItems || valuationItems.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '32px 0' }}>No valuation items available.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 16px' }}>Item Name</th>
                      <th style={{ padding: '14px 16px' }}>SKU</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Available Qty</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Unit Cost Price</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Unit Selling Price</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Inventory Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedValuationItems.map((item) => (
                      <tr key={item.product_id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>
                          {item.product_name || item.name || 'Unnamed Item'}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--muted)' }}>{item.sku}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                          {Number(item.current_stock || 0)} {item.unit_name || ''}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted)' }}>
                          ₹{Number(item.purchase_price || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted)' }}>
                          ₹{Number(item.selling_price || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#4f46e5' }}>
                          ₹{Number(item.total_value ?? item.stock_value ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalReportsCount > 0 && (
                <PaginationControls
                  currentPage={currentReportPage}
                  totalPages={totalReportPages}
                  pageSize={reportPageSize}
                  totalItems={totalReportsCount}
                  onPageChange={(pg) => setReportPage(pg)}
                  onPageSizeChange={(sz) => {
                    setReportPageSize(sz);
                    setReportPage(1);
                  }}
                  itemLabel="items"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* MODALS */}
      <ProductFormModal
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        onSubmit={handleProductSubmit}
        initialData={selectedProductForEdit}
        categories={categories}
        units={units}
        isEdit={!!selectedProductForEdit}
      />

      <StockMovementModal
        isOpen={movementModalOpen}
        onClose={() => {
          setMovementModalOpen(false);
          setSelectedProductForMovement(null);
        }}
        type={movementType}
        products={products}
        onSubmit={handleMovementSubmit}
        selectedProduct={selectedProductForMovement}
      />

      <CategoryFormModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setSelectedCategoryForEdit(null);
        }}
        onSubmit={handleCategorySubmit}
        initialData={selectedCategoryForEdit}
      />

      <UnitFormModal
        isOpen={unitModalOpen}
        onClose={() => {
          setUnitModalOpen(false);
          setSelectedUnitForEdit(null);
        }}
        onSubmit={handleUnitSubmit}
        initialData={selectedUnitForEdit}
      />

      <ProductImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => loadAllData()}
      />
    </div>
  );
};

export default InventoryPage;
