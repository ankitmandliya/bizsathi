export type VendorType = 'Individual' | 'Business';
export type OpeningBalanceType = 'Payable' | 'Advance';

export interface Vendor {
  id: string;
  tenant_id: string;
  name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  vendor_type: VendorType;
  company_name?: string | null;
  billing_address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  payment_terms?: string | null;
  opening_balance: number;
  opening_balance_type: OpeningBalanceType;
  notes?: string | null;
  outstanding_payable: number;
  outstanding_display: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCreateInput {
  name: string;
  phone: string;
  contact_person?: string | null;
  email?: string | null;
  vendor_type?: VendorType;
  company_name?: string | null;
  billing_address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  payment_terms?: string | null;
  opening_balance?: number;
  opening_balance_type?: OpeningBalanceType;
  notes?: string | null;
}

export interface VendorUpdateInput {
  name?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  email?: string | null;
  vendor_type?: VendorType | null;
  company_name?: string | null;
  billing_address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  payment_terms?: string | null;
  opening_balance?: number | null;
  opening_balance_type?: OpeningBalanceType | null;
  notes?: string | null;
}

export interface PaginatedVendorsResponse {
  items: Vendor[];
  total: number;
  page: number;
  limit: number;
}

export interface VendorImportSummaryResponse {
  total_rows: number;
  imported: number;
  skipped_duplicates: number;
  failed: number;
  errors: Array<{
    row_number: number;
    vendor_name?: string;
    reason: string;
  }>;
}
