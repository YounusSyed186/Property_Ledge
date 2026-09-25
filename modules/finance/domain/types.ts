export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded';

export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'card'
  | 'credit_card'
  | 'debit_card'
  | 'cheque'
  | 'direct_debit'
  | 'stripe'
  | 'bpay'
  | 'other';

export interface CategoryGroupDTO {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxClassificationDTO {
  id: string;
  workspace_id: string;
  name: string;
  bas_code: string | null; // e.g. "G1", "1A", "1B", "G10"
  description: string | null;
  applies_to?: 'income' | 'expense' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryDTO {
  id: string;
  transaction_type: TransactionType;
  name: string;
  description: string | null;
  category_group_id?: string | null;
  default_tax_classification_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category_group?: CategoryGroupDTO | null;
  default_tax_classification?: TaxClassificationDTO | null;
}

export interface ReceiptAttachment {
  url: string;
  blobPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface TransactionDTO {
  id: string;
  amount: number;
  transaction_type: TransactionType;
  transaction_category_id: string;
  transaction_date: string;
  payment_method: string | null;
  description: string | null;
  reference: string | null;
  vendor_name: string | null;
  notes: string | null;
  status: TransactionStatus;
  tenant_id: string | null;
  lease_id: string | null;
  invoice_id: string | null;
  property_id: string;
  workspace_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Australian GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;

  // Receipt Attachment (Stored in Vercel Blob)
  receipt_url?: string | null;
  receipt_blob_path?: string | null;
  receipt_file_name?: string | null;
  receipt_file_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_uploaded_at?: string | null;

  // Populated relations
  category?: CategoryDTO | null;
  tax_classification?: TaxClassificationDTO | null;
  property?: {
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
    gst_enabled?: boolean;
  } | null;
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  } | null;
  lease?: {
    id: string;
    start_date?: string | null;
    end_date?: string | null;
    rent_amount?: number | null;
    status?: string | null;
  } | null;
  invoice?: {
    id: string;
    invoice_number: string;
    total_amount?: number;
  } | null;
}

export interface LedgerEntryDTO {
  id: string;
  transaction: TransactionDTO;
  date: string;
  description: string;
  transaction_type: TransactionType;
  category_name: string;
  property_name: string;
  reference: string | null;
  money_in: number;
  money_out: number;
  running_balance: number;
  status: TransactionStatus;
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_name?: string | null;
  bas_code?: string | null;
}

export interface CategoryBreakdownItem {
  category_id: string;
  name: string;
  transaction_type: TransactionType;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyFinancialTrend {
  month: string; // e.g. "2026-09" or "Sep 2026"
  income: number;
  expense: number;
  net: number;
}

export interface FinancialSummaryDTO {
  total_income: number;
  total_expense: number;
  net_profit: number;
  pending_amount: number;
  transaction_count: number;
  income_by_category: CategoryBreakdownItem[];
  expense_by_category: CategoryBreakdownItem[];
  monthly_trend: MonthlyFinancialTrend[];
}

export interface CreateTransactionInput {
  amount: number;
  transaction_type: TransactionType;
  transaction_category_id: string;
  transaction_date: string;
  property_id: string;
  workspace_id?: string;
  payment_method?: string | null;
  description?: string | null;
  reference?: string | null;
  vendor_name?: string | null;
  notes?: string | null;
  status?: TransactionStatus;
  tenant_id?: string | null;
  lease_id?: string | null;
  invoice_id?: string | null;

  // GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;

  // Receipt Attachment
  receipt_url?: string | null;
  receipt_blob_path?: string | null;
  receipt_file_name?: string | null;
  receipt_file_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_uploaded_at?: string | null;
}

export interface UpdateTransactionInput {
  amount?: number;
  transaction_type?: TransactionType;
  transaction_category_id?: string;
  transaction_date?: string;
  property_id?: string;
  payment_method?: string | null;
  description?: string | null;
  reference?: string | null;
  vendor_name?: string | null;
  notes?: string | null;
  status?: TransactionStatus;
  tenant_id?: string | null;
  lease_id?: string | null;
  invoice_id?: string | null;

  // GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;

  // Receipt Attachment
  receipt_url?: string | null;
  receipt_blob_path?: string | null;
  receipt_file_name?: string | null;
  receipt_file_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_uploaded_at?: string | null;
}

export interface TransactionFilterParams {
  workspace_id?: string;
  property_id?: string;
  transaction_type?: TransactionType | 'all';
  transaction_category_id?: string;
  tax_classification_id?: string;
  tenant_id?: string;
  lease_id?: string;
  invoice_id?: string;
  status?: TransactionStatus | 'all';
  payment_method?: string;
  search_query?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export type AllocationStrategy = 'equal_obligation' | 'pro_rata';

export interface AllocationItemDTO {
  lease_id: string;
  property_id: string;
  property_name: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  monthly_rent: number;
  allocated_amount: number;
  percentage: number;
}

export interface PaymentAllocationResult {
  total_payment: number;
  total_allocated: number;
  remaining_unallocated: number;
  strategy: AllocationStrategy;
  allocations: AllocationItemDTO[];
}

export type ScheduleType = 'lease' | 'independent';
export type ScheduleFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type ExpectedPaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface TransactionScheduleAllocationDTO {
  id: string;
  transaction_id: string;
  expected_payment_id: string;
  allocated_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  transaction?: TransactionDTO | null;
}

export interface ExpectedPaymentScheduleDTO {
  id: string;
  workspace_id: string;
  property_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  transaction_category_id: string | null;
  schedule_name: string;
  schedule_type: ScheduleType;
  amount: number;
  due_date: string;
  frequency: ScheduleFrequency;
  status: ExpectedPaymentStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Australian GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;

  // Computed & Relation fields
  total_allocated?: number;
  remaining_amount?: number;
  category?: CategoryDTO | null;
  tax_classification?: TaxClassificationDTO | null;
  property?: {
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
    gst_enabled?: boolean;
  } | null;
  lease?: {
    id: string;
    start_date?: string | null;
    end_date?: string | null;
    rent_amount?: number | null;
    status?: string | null;
    tenant_id?: string | null;
    tenant?: {
      id: string;
      first_name: string;
      last_name: string;
      email?: string | null;
    } | null;
    lease_tenants?: Array<{
      tenant_id?: string;
      role?: string;
      is_primary?: boolean;
      tenant?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string | null;
      } | null;
    }>;
  } | null;
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  } | null;
  allocations?: TransactionScheduleAllocationDTO[];
}

export interface CreateExpectedScheduleInput {
  workspace_id?: string;
  property_id?: string | null;
  lease_id?: string | null;
  tenant_id?: string | null;
  transaction_category_id?: string | null;
  schedule_name: string;
  schedule_type: ScheduleType;
  amount: number;
  start_date: string;
  end_date: string;
  frequency: ScheduleFrequency;
  notes?: string | null;
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;
}

export interface UpdateExpectedScheduleInput {
  schedule_name?: string;
  amount?: number;
  due_date?: string;
  notes?: string | null;
  status?: ExpectedPaymentStatus;
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;
}

export interface ExpectedScheduleFilterParams {
  workspace_id?: string;
  property_id?: string;
  lease_id?: string;
  schedule_type?: ScheduleType | 'all';
  status?: ExpectedPaymentStatus | 'all';
  search_query?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AllocateTransactionInput {
  transaction_id: string;
  expected_payment_id: string;
  allocated_amount: number;
  notes?: string;
}

export interface RecordTransactionFromExpectedInput {
  expected_payment_id: string;
  amount: number;
  payment_method: string;
  transaction_date: string;
  transaction_category_id: string;
  property_id?: string;
  lease_id?: string;
  tenant_id?: string;
  description?: string;
  notes?: string;
  allocation_amount?: number;
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;
}

// ====================================================================
// Expense Tracking — Direct View/Filter Over Transactions
// ====================================================================

export type ExpenseStatus = 'pending' | 'completed' | 'cancelled' | 'partially_paid' | 'paid';

export interface TransactionAttachmentDTO {
  id: string;
  workspace_id: string;
  transaction_id: string;
  blob_url: string;
  blob_path: string;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  source_path?: string | null;
  created_at: string;
}

export interface ExpenseDTO {
  id: string;
  workspace_id: string;
  property_id: string;
  lease_id?: string | null;
  transaction_category_id?: string | null;
  amount: number;
  transaction_date: string;
  expense_date?: string; // Virtual/alias for transaction_date
  vendor_name?: string | null;
  description?: string | null;
  reference?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  status: TransactionStatus | ExpenseStatus;
  receipt_url?: string | null;
  receipt_blob_path?: string | null;
  receipt_file_name?: string | null;
  receipt_file_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_uploaded_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Australian GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;

  // Computed & Relation fields
  category?: CategoryDTO | null;
  tax_classification?: TaxClassificationDTO | null;
  property?: {
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
    gst_enabled?: boolean;
  } | null;
  lease?: {
    id: string;
    start_date?: string | null;
    end_date?: string | null;
    rent_amount?: number | null;
    status?: string | null;
  } | null;
  attachments?: TransactionAttachmentDTO[];
}

export interface CreateExpenseInput {
  workspace_id?: string;
  property_id: string;
  lease_id?: string | null;
  transaction_category_id?: string | null;
  amount: number;
  transaction_date?: string;
  expense_date?: string; // Accepted for UI compatibility
  vendor_name?: string | null;
  description?: string | null;
  reference?: string | null;
  notes?: string | null;
  payment_method?: PaymentMethod | string | null;
  status?: TransactionStatus | ExpenseStatus;
  receipt_url?: string | null;
  receipt_blob_path?: string | null;
  receipt_file_name?: string | null;
  receipt_file_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_uploaded_at?: string | null;

  // Australian GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;

  // Multi-file attachments
  attachments?: Array<{
    blob_url: string;
    blob_path: string;
    file_name: string;
    mime_type?: string;
    file_size?: number;
  }>;
}

export interface UpdateExpenseInput {
  property_id?: string;
  lease_id?: string | null;
  transaction_category_id?: string | null;
  amount?: number;
  transaction_date?: string;
  expense_date?: string;
  vendor_name?: string | null;
  description?: string | null;
  reference?: string | null;
  notes?: string | null;
  payment_method?: PaymentMethod | string | null;
  status?: TransactionStatus | ExpenseStatus;
  receipt_url?: string | null;
  receipt_blob_path?: string | null;
  receipt_file_name?: string | null;
  receipt_file_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_uploaded_at?: string | null;

  // Australian GST & Tax Classification
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;
}

export interface ExpenseFilterParams {
  workspace_id?: string;
  property_id?: string;
  lease_id?: string;
  transaction_category_id?: string;
  tax_classification_id?: string;
  status?: TransactionStatus | ExpenseStatus | 'all';
  search_query?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ====================================================================
// Australian BAS Activity Statement Domain Types
// ====================================================================

export type BasPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11' | 'M12';

export interface BasDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // e.g. "Q1 (Jul 2025 – Sep 2025)"
  financialYear: number; // e.g. 2026 for FY 2025-2026
  period: BasPeriod;
}

export interface BasWorksheetTotals {
  totalSales: number;       // G1 (Gross Sales / Income)
  gstOnSales: number;       // 1A (GST Collected)
  totalExpenses: number;    // Gross Purchases / Expenses
  gstOnExpenses: number;    // 1B (GST Paid / Input Tax Credits)
  netGstPosition: number;   // 1A - 1B (Positive = Payable, Negative = Refund)
  capitalExpensesGross: number; // G10 (Capital Purchases)
  nonCapitalExpensesGross: number; // G11 (Non-Capital Purchases)
}

export interface BasCategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryGroup: string;
  gross: number;
  gst: number;
  net: number;
  basCode?: string | null;
  count: number;
  transactionIds: string[];
}

export interface BasFigureItem {
  code: string;       // e.g. "G1", "1A", "1B"
  label: string;      // e.g. "Total Sales"
  amount: number;
  footnoteSymbol: string; // e.g. "¹", "²", "³"
  description: string;
}

export interface BasWorksheetDTO {
  propertyName: string;
  propertyId: string | null; // null for "All Properties"
  financialYear: number;
  period: BasPeriod;
  periodLabel: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totals: BasWorksheetTotals;
  incomeByCategory: BasCategoryBreakdownItem[];
  expenseByCategory: BasCategoryBreakdownItem[];
  basFigures: BasFigureItem[];
  unclassifiedCount: number;
  totalTransactionsCount: number;
}

export interface BasTransactionDTO {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  category: string;
  categoryGroup: string;
  taxClassification: string;
  propertyName: string;
  amount: number; // Gross amount
  gstAmount: number;
  netAmount: number;
  gstInclusive: boolean;
  basCode: string | null;
  reference: string | null;
  status: TransactionStatus;
}

export interface BasGuidanceItem {
  basField: string;        // e.g. "G1 – Total sales"
  ledgeLabel: string;      // e.g. "Total Sales (Worksheet)"
  amount: number;
  explanation: string;     // Instructions for entering into ATO BAS
  footnoteSymbol?: string;
}

export interface BasFilterParams {
  workspaceId?: string;
  propertyId?: string | null; // null = All Properties
  financialYear: number;
  period: BasPeriod;
}




