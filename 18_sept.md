# BizSathi Panel — Developed Features & Options Summary (18 Sept 2026)

**Document Purpose:** Complete technical reference and user guide documenting all developed panel features, UI options, modal workflows, theme architecture, backend APIs, and responsive components for BizSathi.

---

## 1. Global Navigation & Panel Layout (`DashboardLayout.tsx`)

- **Brand Header & Identity:** "BizSathi — Your business, made simple." displaying active business account ("Ramesh Traders · Owner").
- **Responsive Off-Screen Navigation Drawer (Mobile & Tablet < 992px):**
  - Topbar hamburger menu button (`.mobile-menu-btn`).
  - Smooth slide-in sidebar drawer (`.sidebar.open`) with dark backdrop overlay.
  - Dedicated close button (`X`) and automatic drawer closure upon route navigation (`onNavigate`).
- **Sticky Topbar Controls:**
  - Global Search Input ("Search customers, invoices, leads...").
  - Quick Add Action Button (`+ Quick Add`).
  - **Theme Switcher Toggle:** Instant toggle between Light Mode (Moon icon) and Dark Mode (Sun icon).
  - Help & Documentation Action (`HelpCircle`).
  - Notifications Trigger (`Bell` with active indicator dot).
  - User Avatar Badge ("RT").

---

## 2. CRM & Lead Management Module (`/crm`)

### 2.1 View Options & KPI Metrics
- **View Switcher:**
  - **Pipeline View:** Visual Kanban board grouped by stage.
  - **List View:** Searchable tabular data table.
- **Stage Metrics KPI Bar:**
  - `New Lead`: Lead count & sum value in INR (`₹`).
  - `Contacted`: Lead count & sum value in INR (`₹`).
  - `Qualified`: Lead count & sum value in INR (`₹`).
  - `Proposal Sent`: Lead count & sum value in INR (`₹`).
  - `Closed Won`: Lead count & sum value in INR (`₹`).
  - `Closed Lost`: Lead count & sum value in INR (`₹`).

### 2.2 Kanban Board & Cards (`DealsListPage.tsx`, `LeadsListPage.tsx`)
- Stage columns with lead count badges and color-coded stage accents.
- Card details: Lead/Client name, Company name, Estimated deal value (`₹`), Lead source badge (Website, Referral, Social, Direct, Cold Call), follow-up date badge.
- Win Probability Progress Bar (0% to 100%).
- Quick Contact Actions: `Call` (Phone launcher) and `WA` (WhatsApp launcher).
- Drag & click stage transition capabilities.

### 2.3 List Data Table Options
- Live search bar filtering by name, company, email, or phone.
- Stage Filter dropdown menu.
- Table Columns: Lead Name, Company, Contact, Estimated Value (`₹`), Stage Badge, Source, Action Trigger.

### 2.4 Lead Form Modal (`LeadFormModal.tsx`)
- **Form Fields:**
  - Lead Name (Required)
  - Company Name & Job Title
  - Email Address & Phone Number
  - WhatsApp Number
  - Estimated Deal Value in INR (`₹`)
  - Stage Selection Dropdown (`New Lead`, `Contacted`, `Qualified`, `Proposal Sent`, `Closed Won`, `Closed Lost`)
  - Lead Source Dropdown (`Website`, `Referral`, `Social Media`, `Cold Call`, `Direct`, `Partner`)
  - Industry, Address, City, State, Country
  - Notes / Description & Lost Reason (for Closed Lost leads)
- **Responsive Grid:** `.form-row-2col` and `.form-row-3col` grid (collapses to 1 column under 640px).
- **Sticky Footer Actions:** High-contrast `Cancel` button and primary `Save / Create Lead` button.

### 2.5 Lead Detail View & Sub-Modals (`LeadDetailPage.tsx`)
- Complete lead profile card with fast stage update buttons.
- Communication timeline log.
- **Activity Modal (`ActivityFormModal.tsx`):** Log calls, meetings, emails, tasks, set due dates and completion status.
- **Deal Modal (`DealFormModal.tsx`):** Track deal value, closing date, probability %, and won/lost reasons.

---

## 3. Customer Management Module (`/customers`)

### 3.1 Customer Directory (`CustomersListPage.tsx`)
- Search input by name, email, phone, GSTIN.
- Customer metrics cards (Total Customers, Active Accounts, Outstanding Balances).
- Customer Table: Name, Company, Email, Phone, GSTIN, Total Spend (`₹`), Status badge, Action triggers.

### 3.2 Customer Modal (`CustomerModal.tsx`)
- **Fields:** Customer Name, Company Name, Email, Phone, GSTIN, Billing Address, Shipping Address, Payment Terms.

### 3.3 Customer Detail View (`CustomerDetailPage.tsx`)
- 360-degree customer profile view.
- Sub-tabs: Profile Info, Associated Leads, Quotations History, Invoices & Payment Ledger.

### 3.4 Customer Financial Statement Modal (`CustomerStatementModal.tsx`)
- Date range filtering (Start Date, End Date).
- Transaction log table (Invoices, Payments, Refunds, Balance due).
- Subtotal, Tax Total, and Net Balance summary.
- `Print Statement` trigger.

---

## 4. Sales & Quotations Module (`/sales/quotations`)

### 4.1 Quotations List Page (`QuotationsListPage.tsx`)
- Summary Metrics (Total Quotations Value, Sent Count, Accepted Rate %, Expired Count).
- Filter Bar: Search by quotation number or customer name, status filter (`Draft`, `Sent`, `Accepted`, `Declined`, `Expired`, `Invoiced`).
- Action Buttons: `+ Create Quotation`, Download PDF, Convert to Invoice.

### 4.2 Quotation Modal (`QuotationModal.tsx`)
- **Header Details:** Customer selection dropdown, Issue Date, Valid Until Date.
- **Dynamic Multi-Item Line Table:**
  - Product/Service Description.
  - Quantity input.
  - Rate in INR (`₹`) input.
  - GST Tax Rate Dropdown (`0% GST`, `5% GST`, `12% GST`, `18% GST`, `28% GST`).
  - Live Line Item Total Calculation (`₹`).
  - Remove Item button (`Trash2` icon).
  - `+ Add Item` button.
- **Totals Summary:** Live calculated Subtotal, Total GST Tax, and Grand Total (`₹`).
- **Notes / Terms & Conditions:** Default terms ("Payment due within 30 days. Quotation valid for 30 days.").
- **Sticky Footer Actions:** High-contrast `Cancel` button and `Save Quotation` button.

---

## 5. Invoicing & Payments Module (`/sales/invoices`)

### 5.1 Invoices List Page (`InvoicesListPage.tsx`)
- Outstanding Balance Summary (Total Receivables `₹`, Overdue Amount `₹`, Paid Total `₹`).
- Invoice Table: Invoice Number, Customer Name, Issue Date, Due Date, Total Amount (`₹`), Amount Due (`₹`), Status Badge (`Draft`, `Sent`, `Paid`, `Partially Paid`, `Overdue`, `Cancelled`).
- Table Actions: View Details, Record Payment, Download PDF, Send Reminder.

### 5.2 Invoice Modal (`InvoiceModal.tsx`)
- Customer selection dropdown, Issue Date, Due Date.
- Dynamic multi-item line table with GST tax selector (`0%` to `28%`).
- Grand total, subtotal, and tax calculation.
- Payment details / Bank transfer notes.
- Sticky footer buttons (`Cancel`, `Save Invoice`).

### 5.3 Invoice Detail Page (`InvoiceDetailPage.tsx`)
- Tax Invoice layout template with GSTIN, billing info, itemized table, and tax breakdown.
- Payment history log with receipt details.
- Action Bar: `Download PDF`, `Send Reminder`, `Record Payment`, `Back to Invoices`.

### 5.4 Record Payment Modal (`RecordPaymentModal.tsx`)
- Invoice selector & balance display.
- Payment Amount input (`₹`).
- Payment Date selector.
- Payment Method Dropdown (`UPI`, `Bank Transfer / NEFT / RTGS`, `Cash`, `Cheque`, `Credit Card`).
- Transaction Reference / UTR Number.
- Automatic invoice status update (`Paid` if balance is zero, `Partially Paid` if remaining).

---

## 6. Design System & Theme Engine (`index.css`, `ThemeContext.tsx`)

- **Color Palettes:**
  - **Light Theme Tokens:** `--bg: #f8fafc`, `--panel: #ffffff`, `--panel-alt: #f1f5f9`, `--text: #0f172a`, `--line: #e2e8f0`, `--primary: #2563eb`.
  - **Dark Theme Tokens:** `--bg: #0b0f19`, `--panel: #1e293b`, `--panel-alt: #0f172a`, `--text: #f8fafc`, `--line: #334155`, `--primary: #2563eb`.
- **Button Variants:** `.btn-primary`, `.btn-outline`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-icon-close`. All buttons styled with high-contrast font tokens for both themes.
- **Badges & Status Elements:** `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-secondary`.
- **Mobile Responsive Media Queries:**
  - `@media (max-width: 992px)`: Sidebar becomes off-screen drawer.
  - `@media (max-width: 768px)`: Padding adjustments, filter bar stacking, table horizontal scroll containers (`.table-container`).
  - `@media (max-width: 640px)`: Form grid 1-column collapse, modal max-height viewport scaling.

---

## 7. Backend REST API Endpoints (`backend/app/api/v1/`)

### 7.1 CRM Endpoints (`/api/v1/crm`)
- `GET /api/v1/crm/leads` — List leads (supports limit, search, stage_id).
- `POST /api/v1/crm/leads` — Create lead.
- `GET /api/v1/crm/leads/{id}` — Get lead by ID.
- `PUT /api/v1/crm/leads/{id}` — Update lead details.
- `DELETE /api/v1/crm/leads/{id}` — Delete lead.
- `GET /api/v1/crm/customers` — List customers.
- `POST /api/v1/crm/customers` — Create customer.
- `GET /api/v1/crm/customers/{id}` — Get customer details.
- `PUT /api/v1/crm/customers/{id}` — Update customer.
- `GET /api/v1/crm/pipeline-stages` — Get default Kanban pipeline stages.
- `GET /api/v1/crm/activities` & `POST /api/v1/crm/activities` — CRM activity logging.

### 7.2 Sales Endpoints (`/api/v1/sales`)
- `GET /api/v1/sales/quotations` — List quotations.
- `POST /api/v1/sales/quotations` — Create quotation with line items.
- `GET /api/v1/sales/quotations/{id}` — Get quotation details.
- `GET /api/v1/sales/invoices` — List tax invoices.
- `POST /api/v1/sales/invoices` — Create invoice with sequential tenant numbering (`INV-2026-0001`).
- `GET /api/v1/sales/invoices/{id}` — Get invoice details.
- `POST /api/v1/sales/invoices/{id}/payments` — Record payment against invoice.
- `GET /api/v1/sales/customers/{id}/statement` — Generate customer financial statement.

---

## 8. Verification & Quality Metrics

| Verification Category | Target Standard | Status |
| :--- | :--- | :--- |
| **Frontend Build** | `npm run build` | **0 errors** (1839 modules built) |
| **Frontend Unit Tests** | `npm run test` | **5/5 test files passed** (7/7 tests passed) |
| **Backend Pytest** | `pytest` | **20/20 PASSED** (100%) |
| **Database Migrations** | `alembic upgrade head` | Applied `003_sales_module` cleanly |
| **Theme Contrast** | WCAG AA Legibility | Passed on Light & Dark themes |
| **Mobile Responsiveness** | Viewports 390px - 992px | Drawer navigation & scroll wrappers verified |
