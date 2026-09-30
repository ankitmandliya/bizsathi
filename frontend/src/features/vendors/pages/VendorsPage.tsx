import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { vendorApi } from '../services/vendorApi';
import { Vendor, VendorCreateInput } from '../types/vendor';
import { VendorFormModal } from '../components/VendorFormModal';
import { VendorImportModal } from '../components/VendorImportModal';
import { AuditLogButton } from '../../../components/common/AuditLogButton';

const SAMPLE_VENDORS_DATA: VendorCreateInput[] = [
  {
    name: 'Apex Industrial Supplies Pvt Ltd',
    contact_person: 'Rajesh Sharma',
    phone: '+91 98230 11223',
    email: 'rajesh@apexindustrial.in',
    vendor_type: 'Business',
    company_name: 'Apex Industrial Supplies Pvt Ltd',
    billing_address: 'Plot 42, MIDC Industrial Area, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    gstin: '27AAACA1234A1Z5',
    pan: 'AAACA1234A',
    payment_terms: 'Net 30',
    opening_balance: 45000,
    opening_balance_type: 'Payable',
    notes: 'Primary supplier for heavy machinery, safety gear, and industrial equipment.',
  },
  {
    name: 'Mahavir Tech & Electronics',
    contact_person: 'Amit Shah',
    phone: '+91 98111 44556',
    email: 'sales@mahavirtech.com',
    vendor_type: 'Business',
    company_name: 'Mahavir Tech & Electronics',
    billing_address: 'Shop 12, CG Road Electronics Market',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380009',
    gstin: '24BBBBM5678B1Z2',
    pan: 'BBBBM5678B',
    payment_terms: 'Net 15',
    opening_balance: 12500,
    opening_balance_type: 'Payable',
    notes: 'Vendor for office IT hardware, peripherals, cables, and electronic components.',
  },
  {
    name: 'GreenLeaf Packaging Solutions',
    contact_person: 'Sunita Verma',
    phone: '+91 97400 88990',
    email: 'contact@greenleafpack.in',
    vendor_type: 'Business',
    company_name: 'GreenLeaf Packaging Solutions',
    billing_address: '88 Peenya Industrial Estate, Phase 3',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560058',
    gstin: '29CCCCG9012C1Z8',
    pan: 'CCCCG9012C',
    payment_terms: 'Due on Receipt',
    opening_balance: 8500,
    opening_balance_type: 'Advance',
    notes: 'Eco-friendly corrugated boxes, tape rolls, bubble wraps, and custom shipping labels.',
  },
  {
    name: 'Sharma Logistics & Freight Services',
    contact_person: 'Vikram Sharma',
    phone: '+91 99887 66554',
    email: 'vikram@sharmalogistics.com',
    vendor_type: 'Business',
    company_name: 'Sharma Logistics & Freight Services',
    billing_address: 'Transport Nagar, Outer Ring Road',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110042',
    gstin: '07DDDDS3456D1Z1',
    pan: 'DDDDS3456D',
    payment_terms: 'Net 45',
    opening_balance: 28000,
    opening_balance_type: 'Payable',
    notes: 'Logistics partner for nationwide freight, parcel dispatch, and bulk cargo distribution.',
  },
  {
    name: 'Rohan Raw Materials & Hardware',
    contact_person: 'Rohan Gupta',
    phone: '+91 98980 12345',
    email: 'rohan@rohanent.com',
    vendor_type: 'Individual',
    company_name: 'Rohan Raw Materials & Hardware',
    billing_address: 'G-14 Vishwakarma Industrial Area',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302013',
    gstin: '08EEEEG7890E1Z4',
    pan: 'EEEEG7890E',
    payment_terms: 'Net 30',
    opening_balance: 15000,
    opening_balance_type: 'Advance',
    notes: 'Direct supplier of steel rods, aluminum sheets, nuts & bolts for fabrication.',
  },
  {
    name: 'Zenith Office Stationery Depot',
    contact_person: 'Priya Nair',
    phone: '+91 94470 55112',
    email: 'orders@zenithstationery.in',
    vendor_type: 'Business',
    company_name: 'Zenith Office Stationery Depot',
    billing_address: 'MG Road Trade Tower, 2nd Floor',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682016',
    gstin: '32FFFFZ2468F1Z9',
    pan: 'FFFFZ2468F',
    payment_terms: 'Net 15',
    opening_balance: 3200,
    opening_balance_type: 'Payable',
    notes: 'Wholesale stationery, printing paper reams, cartridges, and office consumable supplies.',
  },
];

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedVendorForEdit, setSelectedVendorForEdit] = useState<Vendor | null>(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorApi.getVendors({
        search: search.trim() || undefined,
        page,
        limit: pageSize,
      });
      setVendors(res.items || []);
      setTotalVendors(res.total || 0);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      setVendors([]);
      setTotalVendors(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleCreateOrUpdateVendor = async (data: VendorCreateInput) => {
    if (selectedVendorForEdit) {
      await vendorApi.updateVendor(selectedVendorForEdit.id, data);
    } else {
      await vendorApi.createVendor(data);
    }
    await loadVendors();
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
      await vendorApi.deleteVendor(vendor.id);
      await loadVendors();
    }
  };

  const handleSeedSampleVendors = async () => {
    setLoading(true);
    try {
      for (const sample of SAMPLE_VENDORS_DATA) {
        try {
          await vendorApi.createVendor(sample);
        } catch (e) {
          // Ignore if phone already exists
        }
      }
      await loadVendors();
    } catch (err) {
      console.error('Error seeding sample vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalVendors / pageSize) || 1;
  const startItem = totalVendors === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalVendors);

  // Aggregate outstanding stats from loaded page or current dataset
  const totalPayableAmount = vendors
    .filter((v) => v.opening_balance_type === 'Payable')
    .reduce((acc, v) => acc + Number(v.opening_balance || 0), 0);

  const totalAdvanceAmount = vendors
    .filter((v) => v.opening_balance_type === 'Advance')
    .reduce((acc, v) => acc + Number(v.opening_balance || 0), 0);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

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
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Vendor Management
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
            Supplier directory, contact profiles, payment terms & outstanding opening balances
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadVendors()}
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
            }}
            title="Refresh Vendor List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleSeedSampleVendors}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              color: '#1d4ed8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} /> Seed Sample Vendors
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
            }}
          >
            <Upload size={16} /> Import Vendors
          </button>

          <AuditLogButton
            entityTypes={['vendor']}
            title="Vendor Audit Log"
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
              setSelectedVendorForEdit(null);
              setVendorModalOpen(true);
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
            }}
          >
            <Plus size={18} /> Add Vendor
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Vendors */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Registered Vendors</p>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0', color: 'var(--text)' }}>
            {totalVendors}
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0' }}>
            Active supplier directory
          </p>
        </div>

        {/* Card 2: Total Outstanding Payable */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Total Payable Balance</p>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0', color: '#b45309' }}>
            ₹{totalPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p style={{ fontSize: '11px', color: '#b45309', margin: '4px 0 0' }}>
            Amount owed to suppliers
          </p>
        </div>

        {/* Card 3: Total Advance Balance */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>Total Advance Paid</p>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0', color: '#047857' }}>
            ₹{totalAdvanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p style={{ fontSize: '11px', color: '#047857', margin: '4px 0 0' }}>
            Advance payments to suppliers
          </p>
        </div>
      </div>

      {/* Main Vendor List Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
        {/* Search Toolbar */}
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
            <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by vendor name, company, phone, email, GSTIN..."
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
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
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
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
            Showing {startItem}–{endItem} of {totalVendors} vendors
          </span>
        </div>

        {/* Vendors Table */}
        {vendors.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', borderRadius: '12px', margin: '24px' }}>
            <Building2 size={36} color="var(--muted)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>No vendors found</p>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 16px' }}>
              Try adjusting your search query, click "Add Vendor", or populate with sample vendor data to test APIs.
            </p>
            <button
              type="button"
              onClick={handleSeedSampleVendors}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} /> Feed Sample Vendors
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)', background: 'var(--panel-alt)', color: 'var(--muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px' }}>Vendor Name</th>
                  <th style={{ padding: '14px 16px' }}>Phone / Email</th>
                  <th style={{ padding: '14px 16px' }}>Company / Type</th>
                  <th style={{ padding: '14px 16px' }}>Payment Terms</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Outstanding Balance</th>
                  <th style={{ padding: '14px 16px' }}>City / State</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--line)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)' }}>
                      <div>{v.name}</div>
                      {v.contact_person && (
                        <p style={{ fontSize: '11px', fontWeight: 400, color: 'var(--muted)', margin: '2px 0 0' }}>
                          Contact: {v.contact_person}
                        </p>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text)', fontWeight: 600, fontSize: '12px' }}>
                        <Phone size={12} color="var(--muted)" /> {v.phone}
                      </div>
                      {v.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
                          <Mail size={12} /> {v.email}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v.company_name || '—'}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: v.vendor_type === 'Business' ? '#e0e7ff' : '#f3e8ff',
                          color: v.vendor_type === 'Business' ? '#4338ca' : '#6b21a8',
                          marginTop: '2px',
                        }}
                      >
                        {v.vendor_type}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--text)', fontSize: '12px', fontWeight: 500 }}>
                      {v.payment_terms || '—'}
                      {v.gstin && (
                        <p style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted)', margin: '2px 0 0' }}>
                          GSTIN: {v.gstin}
                        </p>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '13px',
                          padding: '4px 10px',
                          borderRadius: '99px',
                          display: 'inline-block',
                          background:
                            v.opening_balance_type === 'Advance' && v.opening_balance > 0
                              ? '#dcfce7'
                              : v.opening_balance > 0
                              ? '#fef3c7'
                              : 'var(--panel-alt)',
                          color:
                            v.opening_balance_type === 'Advance' && v.opening_balance > 0
                              ? '#15803d'
                              : v.opening_balance > 0
                              ? '#b45309'
                              : 'var(--muted)',
                          border:
                            v.opening_balance_type === 'Advance' && v.opening_balance > 0
                              ? '1px solid #bbf7d0'
                              : v.opening_balance > 0
                              ? '1px solid #fde68a'
                              : '1px solid var(--line)',
                        }}
                      >
                        {v.outstanding_display || 'No balance'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '12px' }}>
                      {[v.city, v.state].filter(Boolean).join(', ') || '—'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVendorForEdit(v);
                          setVendorModalOpen(true);
                        }}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#4f46e5',
                          cursor: 'pointer',
                          marginRight: '4px',
                        }}
                        title="Edit vendor profile"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteVendor(v)}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                        title="Soft delete vendor"
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

        {/* Pagination Footer */}
        {totalVendors > 0 && (
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
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
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
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>per page</span>
              </div>

              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                Showing <strong style={{ color: 'var(--text)' }}>{startItem}–{endItem}</strong> of <strong style={{ color: 'var(--text)' }}>{totalVendors}</strong> vendors
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First Page"
                style={{
                  padding: '6px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: page <= 1 ? 'var(--muted)' : 'var(--text)',
                  opacity: page <= 1 ? 0.4 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                title="Previous Page"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: page <= 1 ? 'var(--muted)' : 'var(--text)',
                  opacity: page <= 1 ? 0.4 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
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
                  const isCurrent = pg === page;
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPage(pg)}
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
                      }}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                title="Next Page"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: page >= totalPages ? 'var(--muted)' : 'var(--text)',
                  opacity: page >= totalPages ? 0.4 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
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
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last Page"
                style={{
                  padding: '6px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  color: page >= totalPages ? 'var(--muted)' : 'var(--text)',
                  opacity: page >= totalPages ? 0.4 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <VendorFormModal
        isOpen={vendorModalOpen}
        onClose={() => {
          setVendorModalOpen(false);
          setSelectedVendorForEdit(null);
        }}
        onSubmit={handleCreateOrUpdateVendor}
        initialData={selectedVendorForEdit}
        isEdit={!!selectedVendorForEdit}
      />

      <VendorImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => loadVendors()}
      />
    </div>
  );
};

export default VendorsPage;
