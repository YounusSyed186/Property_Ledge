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

  // Computed & Relation fields
  total_allocated?: number;
  remaining_amount?: number;
  category?: CategoryDTO | null;
  property?: {
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  lease?: {
    id: string;
    start_date?: string | null;
    end_date?: string | null;
    rent_amount?: number | null;
    status?: string | null;
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
}

export interface UpdateExpectedScheduleInput {
  schedule_name?: string;
  amount?: number;
  due_date?: string;
  notes?: string | null;
  status?: ExpectedPaymentStatus;
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
}


