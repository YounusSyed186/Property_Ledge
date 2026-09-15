export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded';

export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'card'
  | 'cheque'
  | 'direct_debit'
  | 'other';

export interface CategoryDTO {
  id: string;
  transaction_type: TransactionType;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

  // Populated relations
  category?: CategoryDTO | null;
  property?: {
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
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
}

export interface TransactionFilterParams {
  workspace_id?: string;
  property_id?: string;
  transaction_type?: TransactionType | 'all';
  transaction_category_id?: string;
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
