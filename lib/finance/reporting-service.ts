import { createClient } from '@/lib/supabase/server';
import {
  FinanceReportFilters,
  FinancialOverviewReportDTO,
  IncomeReportDTO,
  ExpenseReportDTO,
  CashFlowReportDTO,
  RentReconciliationReportDTO,
  GstReportDTO,
  TaxClassificationReportDTO,
  PropertyPerformanceReportDTO,
  TransactionDetailReportDTO,
  MonthlyFinancialSummary,
  CategoryFinancialSummary,
  TaxClassificationFinancialSummary,
  PropertyFinancialSummary,
  VendorFinancialSummary,
  RentScheduleReconciliationItem,
} from '@/modules/finance/domain/reporting-types';
import { TransactionDTO } from '@/modules/finance/domain/types';
import {
  getFinancialYearRange,
  getFinancialYearMonths,
  getCurrentFinancialYear,
  getFinancialYearStart,
  getFinancialYearEnd,
  parseFinancialYear,
  FinancialYearRange,
} from '@/lib/finance/financial-year';

/**
 * Resolves normalized start & end ISO dates for any report filter.
 */
export function resolveFilterDateRange(filters: FinanceReportFilters): FinancialYearRange {
  if (filters.dateFrom && filters.dateTo) {
    return {
      start: filters.dateFrom,
      end: filters.dateTo,
    };
  }

  const fy = filters.financialYear || getCurrentFinancialYear();
  return getFinancialYearRange(fy);
}

/**
 * Base database query for fetching transactions within a filtered scope
 */
async function fetchFilteredTransactions(filters: FinanceReportFilters): Promise<{
  transactions: TransactionDTO[];
  dateRange: FinancialYearRange;
}> {
  const supabase = await createClient();
  const dateRange = resolveFilterDateRange(filters);

  let query = supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_type,
      transaction_category_id,
      transaction_date,
      payment_method,
      description,
      reference,
      vendor_name,
      notes,
      status,
      tenant_id,
      lease_id,
      invoice_id,
      property_id,
      workspace_id,
      created_by,
      created_at,
      updated_at,
      gst_inclusive,
      gst_amount,
      tax_classification_id,
      receipt_url,
      receipt_blob_path,
      receipt_file_name,
      receipt_file_size,
      receipt_mime_type,
      category:categories(id, transaction_type, name, description, is_active, category_group_id),
      tax_classification:tax_classifications(id, name, bas_code, description, is_active),
      property:properties(id, name, address_line_1, city, state, postal_code, gst_enabled),
      tenant:tenants(id, first_name, last_name, email),
      lease:leases(id, start_date, end_date, rent_amount, status)
    `)
    .gte('transaction_date', dateRange.start)
    .lte('transaction_date', dateRange.end)
    .order('transaction_date', { ascending: false });

  if (filters.workspaceId) {
    query = query.eq('workspace_id', filters.workspaceId);
  }

  if (filters.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }
  if (filters.transactionType && filters.transactionType !== 'all') {
    query = query.eq('transaction_type', filters.transactionType);
  }
  if (filters.categoryId) {
    query = query.eq('transaction_category_id', filters.categoryId);
  }
  if (filters.taxClassificationId) {
    query = query.eq('tax_classification_id', filters.taxClassificationId);
  }
  if (filters.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
  }
  if (filters.leaseId) {
    query = query.eq('lease_id', filters.leaseId);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error in fetchFilteredTransactions:', error);
    throw new Error(`Failed to load financial transactions: ${error.message}`);
  }

  let transactions = (data || []) as unknown as TransactionDTO[];

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    transactions = transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.vendor_name?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q) ||
        tx.category?.name?.toLowerCase().includes(q) ||
        tx.property?.name?.toLowerCase().includes(q) ||
        tx.property?.address_line_1?.toLowerCase().includes(q) ||
        tx.tenant?.first_name?.toLowerCase().includes(q) ||
        tx.tenant?.last_name?.toLowerCase().includes(q)
    );
  }

  return { transactions, dateRange };
}

/**
 * 1. Financial Overview Report
 */
export async function getFinancialOverviewReport(
  filters: FinanceReportFilters
): Promise<FinancialOverviewReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions(filters);
  const fy = filters.financialYear || getCurrentFinancialYear();
  const months = getFinancialYearMonths(fy);

  let totalIncome = 0;
  let totalExpenses = 0;
  let gstCollected = 0;
  let gstPaid = 0;

  // Monthly map setup
  const monthlyMap = new Map<string, MonthlyFinancialSummary>();
  for (const m of months) {
    monthlyMap.set(m.key, {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    });
  }

  const incomeCatMap = new Map<string, CategoryFinancialSummary>();
  const expenseCatMap = new Map<string, CategoryFinancialSummary>();
  const propMap = new Map<string, PropertyFinancialSummary>();

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);
    const dateKey = tx.transaction_date.substring(0, 7); // 'YYYY-MM'

    const mSum = monthlyMap.get(dateKey) || {
      key: dateKey,
      label: dateKey,
      shortLabel: dateKey,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    };
    mSum.transactionCount++;

    if (tx.transaction_type === 'income') {
      totalIncome += amt;
      gstCollected += gst;
      mSum.income += amt;
      mSum.gstCollected += gst;

      // Category breakdown
      const cId = tx.category?.id || 'uncategorized_income';
      const cName = tx.category?.name || 'Unassigned Income';
      const cSum = incomeCatMap.get(cId) || {
        categoryId: cId,
        categoryName: cName,
        transactionType: 'income',
        totalAmount: 0,
        gstAmount: 0,
        transactionCount: 0,
        percentage: 0,
      };
      cSum.totalAmount += amt;
      cSum.gstAmount += gst;
      cSum.transactionCount++;
      incomeCatMap.set(cId, cSum);
    } else {
      totalExpenses += amt;
      gstPaid += gst;
      mSum.expenses += amt;
      mSum.gstPaid += gst;

      // Category breakdown
      const cId = tx.category?.id || 'uncategorized_expense';
      const cName = tx.category?.name || 'Unassigned Expense';
      const cSum = expenseCatMap.get(cId) || {
        categoryId: cId,
        categoryName: cName,
        transactionType: 'expense',
        totalAmount: 0,
        gstAmount: 0,
        transactionCount: 0,
        percentage: 0,
      };
      cSum.totalAmount += amt;
      cSum.gstAmount += gst;
      cSum.transactionCount++;
      expenseCatMap.set(cId, cSum);
    }

    mSum.net = mSum.income - mSum.expenses;
    monthlyMap.set(dateKey, mSum);

    // Property breakdown
    const pId = tx.property?.id || tx.property_id || 'unknown_prop';
    const pName = tx.property?.name || tx.property?.address_line_1 || 'Unassigned Property';
    const pSum = propMap.get(pId) || {
      propertyId: pId,
      propertyName: pName,
      address: tx.property?.address_line_1 || '',
      totalIncome: 0,
      totalExpenses: 0,
      netResult: 0,
      gstCollected: 0,
      gstPaid: 0,
      expectedRent: 0,
      actualRentReceived: 0,
      outstandingRent: 0,
      collectionRate: 100,
      transactionCount: 0,
    };
    pSum.transactionCount++;
    if (tx.transaction_type === 'income') {
      pSum.totalIncome += amt;
      pSum.gstCollected += gst;
    } else {
      pSum.totalExpenses += amt;
      pSum.gstPaid += gst;
    }
    pSum.netResult = pSum.totalIncome - pSum.totalExpenses;
    propMap.set(pId, pSum);
  }

  // Calculate percentages
  const incomeCategories = Array.from(incomeCatMap.values()).map((c) => ({
    ...c,
    percentage: totalIncome > 0 ? Math.round((c.totalAmount / totalIncome) * 1000) / 10 : 0,
  }));
  const expenseCategories = Array.from(expenseCatMap.values()).map((c) => ({
    ...c,
    percentage: totalExpenses > 0 ? Math.round((c.totalAmount / totalExpenses) * 1000) / 10 : 0,
  }));

  // Fetch expected income from expected_payment_schedule for overview KPI
  let totalExpected = 0;
  let totalReceivedFromExpected = 0;
  try {
    const supabase = await createClient();
    let schedQ = supabase
      .from('expected_payment_schedule')
      .select(`
        id,
        amount,
        due_date,
        property_id,
        allocations:transaction_schedule_allocations(allocated_amount)
      `)
      .gte('due_date', dateRange.start)
      .lte('due_date', dateRange.end);

    if (filters.workspaceId) {
      schedQ = schedQ.eq('workspace_id', filters.workspaceId);
    }

    if (filters.propertyId) {
      schedQ = schedQ.eq('property_id', filters.propertyId);
    }

    const { data: schedules } = (await schedQ) as { data: any[] | null };
    if (schedules) {
      for (const s of schedules) {
        const exp = Number(s.amount || 0);
        const paid = (s.allocations || []).reduce(
          (acc: number, a: any) => acc + Number(a.allocated_amount || 0),
          0
        );
        totalExpected += exp;
        totalReceivedFromExpected += paid;

        if (s.property_id && propMap.has(s.property_id)) {
          const p = propMap.get(s.property_id)!;
          p.expectedRent += exp;
          p.actualRentReceived += paid;
          p.outstandingRent = Math.max(0, p.expectedRent - p.actualRentReceived);
          p.collectionRate =
            p.expectedRent > 0
              ? Math.min(100, Math.round((p.actualRentReceived / p.expectedRent) * 1000) / 10)
              : 100;
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch expected schedules for overview:', err);
  }

  return {
    filters,
    dateRange,
    kpis: {
      totalIncome,
      totalExpenses,
      netResult: totalIncome - totalExpenses,
      gstCollected,
      gstPaid,
      netGstPayable: gstCollected - gstPaid,
      expectedIncome: totalExpected,
      actualIncomeReceived: totalReceivedFromExpected,
      outstandingExpectedIncome: Math.max(0, totalExpected - totalReceivedFromExpected),
      transactionCount: transactions.length,
    },
    monthlyTrends: Array.from(monthlyMap.values()),
    incomeByCategory: incomeCategories.sort((a, b) => b.totalAmount - a.totalAmount),
    expenseByCategory: expenseCategories.sort((a, b) => b.totalAmount - a.totalAmount),
    propertyBreakdown: Array.from(propMap.values()).sort((a, b) => b.totalIncome - a.totalIncome),
  };
}

/**
 * 2. Income Report
 */
export async function getIncomeReport(filters: FinanceReportFilters): Promise<IncomeReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions({
    ...filters,
    transactionType: 'income',
  });

  const fy = filters.financialYear || getCurrentFinancialYear();
  const months = getFinancialYearMonths(fy);

  let totalIncome = 0;
  let gstCollected = 0;

  const monthlyMap = new Map<string, MonthlyFinancialSummary>();
  for (const m of months) {
    monthlyMap.set(m.key, {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    });
  }

  const catMap = new Map<string, CategoryFinancialSummary>();
  const propMap = new Map<string, PropertyFinancialSummary>();
  const tenantMap = new Map<string, { tenantId: string; tenantName: string; propertyName: string; totalAmount: number; transactionCount: number }>();

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);
    totalIncome += amt;
    gstCollected += gst;

    const dateKey = tx.transaction_date.substring(0, 7);
    const mSum = monthlyMap.get(dateKey) || {
      key: dateKey,
      label: dateKey,
      shortLabel: dateKey,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    };
    mSum.income += amt;
    mSum.net += amt;
    mSum.gstCollected += gst;
    mSum.transactionCount++;
    monthlyMap.set(dateKey, mSum);

    // Category
    const cId = tx.category?.id || 'unassigned_income';
    const cName = tx.category?.name || 'Unassigned Income';
    const cSum = catMap.get(cId) || {
      categoryId: cId,
      categoryName: cName,
      transactionType: 'income',
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    cSum.totalAmount += amt;
    cSum.gstAmount += gst;
    cSum.transactionCount++;
    catMap.set(cId, cSum);

    // Property
    const pId = tx.property?.id || tx.property_id || 'unassigned_prop';
    const pName = tx.property?.name || tx.property?.address_line_1 || 'Unassigned Property';
    const pSum = propMap.get(pId) || {
      propertyId: pId,
      propertyName: pName,
      address: tx.property?.address_line_1 || '',
      totalIncome: 0,
      totalExpenses: 0,
      netResult: 0,
      gstCollected: 0,
      gstPaid: 0,
      expectedRent: 0,
      actualRentReceived: 0,
      outstandingRent: 0,
      collectionRate: 100,
      transactionCount: 0,
    };
    pSum.totalIncome += amt;
    pSum.netResult += amt;
    pSum.gstCollected += gst;
    pSum.transactionCount++;
    propMap.set(pId, pSum);

    // Tenant
    if (tx.tenant) {
      const tId = tx.tenant.id;
      const tName = `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() || 'Tenant';
      const tSum = tenantMap.get(tId) || {
        tenantId: tId,
        tenantName: tName,
        propertyName: pName,
        totalAmount: 0,
        transactionCount: 0,
      };
      tSum.totalAmount += amt;
      tSum.transactionCount++;
      tenantMap.set(tId, tSum);
    }
  }

  const byCategory = Array.from(catMap.values()).map((c) => ({
    ...c,
    percentage: totalIncome > 0 ? Math.round((c.totalAmount / totalIncome) * 1000) / 10 : 0,
  }));

  return {
    filters,
    dateRange,
    kpis: {
      totalIncome,
      gstCollected,
      expectedRent: 0,
      actualRentReceived: totalIncome,
      outstandingRent: 0,
      transactionCount: transactions.length,
    },
    monthlyIncome: Array.from(monthlyMap.values()),
    byCategory: byCategory.sort((a, b) => b.totalAmount - a.totalAmount),
    byProperty: Array.from(propMap.values()).sort((a, b) => b.totalIncome - a.totalIncome),
    byTenant: Array.from(tenantMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
    transactions,
  };
}

/**
 * 3. Expense Report (Authoritative from transactions WHERE transaction_type = 'expense')
 */
export async function getExpenseReport(filters: FinanceReportFilters): Promise<ExpenseReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions({
    ...filters,
    transactionType: 'expense',
  });

  const fy = filters.financialYear || getCurrentFinancialYear();
  const months = getFinancialYearMonths(fy);

  let totalExpenses = 0;
  let gstPaid = 0;
  let deductibleExpenses = 0;
  let capitalExpenses = 0;

  const monthlyMap = new Map<string, MonthlyFinancialSummary>();
  for (const m of months) {
    monthlyMap.set(m.key, {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    });
  }

  const opCatMap = new Map<string, CategoryFinancialSummary>();
  const taxClassMap = new Map<string, TaxClassificationFinancialSummary>();
  const vendorMap = new Map<string, VendorFinancialSummary>();
  const propMap = new Map<string, PropertyFinancialSummary>();

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);
    totalExpenses += amt;
    gstPaid += gst;

    const tcName = tx.tax_classification?.name?.toLowerCase() || '';
    if (tcName.includes('capital') || tcName.includes('depreciat')) {
      capitalExpenses += amt;
    } else if (!tcName.includes('non-deductible') && !tcName.includes('private')) {
      deductibleExpenses += amt;
    }

    const dateKey = tx.transaction_date.substring(0, 7);
    const mSum = monthlyMap.get(dateKey) || {
      key: dateKey,
      label: dateKey,
      shortLabel: dateKey,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    };
    mSum.expenses += amt;
    mSum.net -= amt;
    mSum.gstPaid += gst;
    mSum.transactionCount++;
    monthlyMap.set(dateKey, mSum);

    // Operational Category
    const cId = tx.category?.id || 'unassigned_expense';
    const cName = tx.category?.name || 'Unassigned Expense';
    const cSum = opCatMap.get(cId) || {
      categoryId: cId,
      categoryName: cName,
      transactionType: 'expense',
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    cSum.totalAmount += amt;
    cSum.gstAmount += gst;
    cSum.transactionCount++;
    opCatMap.set(cId, cSum);

    // Tax Classification
    const tcId = tx.tax_classification?.id || 'unassigned_tax';
    const tcLabel = tx.tax_classification?.name || 'Unclassified Tax';
    const tcSum = taxClassMap.get(tcId) || {
      classificationId: tcId,
      classificationName: tcLabel,
      basCode: tx.tax_classification?.bas_code,
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    tcSum.totalAmount += amt;
    tcSum.gstAmount += gst;
    tcSum.transactionCount++;
    taxClassMap.set(tcId, tcSum);

    // Vendor Breakdown
    const vName = tx.vendor_name?.trim() || tx.description?.trim() || 'Unspecified Vendor';
    const vSum = vendorMap.get(vName) || {
      vendorName: vName,
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    vSum.totalAmount += amt;
    vSum.gstAmount += gst;
    vSum.transactionCount++;
    vendorMap.set(vName, vSum);

    // Property Breakdown
    const pId = tx.property?.id || tx.property_id || 'unassigned_prop';
    const pName = tx.property?.name || tx.property?.address_line_1 || 'Unassigned Property';
    const pSum = propMap.get(pId) || {
      propertyId: pId,
      propertyName: pName,
      address: tx.property?.address_line_1 || '',
      totalIncome: 0,
      totalExpenses: 0,
      netResult: 0,
      gstCollected: 0,
      gstPaid: 0,
      expectedRent: 0,
      actualRentReceived: 0,
      outstandingRent: 0,
      collectionRate: 100,
      transactionCount: 0,
    };
    pSum.totalExpenses += amt;
    pSum.netResult -= amt;
    pSum.gstPaid += gst;
    pSum.transactionCount++;
    propMap.set(pId, pSum);
  }

  const byOperationalCategory = Array.from(opCatMap.values()).map((c) => ({
    ...c,
    percentage: totalExpenses > 0 ? Math.round((c.totalAmount / totalExpenses) * 1000) / 10 : 0,
  }));

  const byTaxClassification = Array.from(taxClassMap.values()).map((tc) => ({
    ...tc,
    percentage: totalExpenses > 0 ? Math.round((tc.totalAmount / totalExpenses) * 1000) / 10 : 0,
  }));

  const byVendor = Array.from(vendorMap.values()).map((v) => ({
    ...v,
    percentage: totalExpenses > 0 ? Math.round((v.totalAmount / totalExpenses) * 1000) / 10 : 0,
  }));

  return {
    filters,
    dateRange,
    kpis: {
      totalExpenses,
      gstPaid,
      deductibleExpenses,
      capitalExpenses,
      transactionCount: transactions.length,
    },
    monthlyExpenses: Array.from(monthlyMap.values()),
    byOperationalCategory: byOperationalCategory.sort((a, b) => b.totalAmount - a.totalAmount),
    byTaxClassification: byTaxClassification.sort((a, b) => b.totalAmount - a.totalAmount),
    byVendor: byVendor.sort((a, b) => b.totalAmount - a.totalAmount),
    byProperty: Array.from(propMap.values()).sort((a, b) => b.totalExpenses - a.totalExpenses),
    transactions,
  };
}

/**
 * 4. Cash Flow Report
 */
export async function getCashFlowReport(filters: FinanceReportFilters): Promise<CashFlowReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions(filters);
  const fy = filters.financialYear || getCurrentFinancialYear();
  const months = getFinancialYearMonths(fy);

  let totalInflow = 0;
  let totalOutflow = 0;

  const monthlyMap = new Map<string, MonthlyFinancialSummary>();
  for (const m of months) {
    monthlyMap.set(m.key, {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    });
  }

  // Quarterly accumulators (Australian Financial Year: Q1 Jul-Sep, Q2 Oct-Dec, Q3 Jan-Mar, Q4 Apr-Jun)
  const quarterMap = {
    Q1: { quarter: 'Q1 (Jul – Sep)', inflow: 0, outflow: 0, net: 0 },
    Q2: { quarter: 'Q2 (Oct – Dec)', inflow: 0, outflow: 0, net: 0 },
    Q3: { quarter: 'Q3 (Jan – Mar)', inflow: 0, outflow: 0, net: 0 },
    Q4: { quarter: 'Q4 (Apr – Jun)', inflow: 0, outflow: 0, net: 0 },
  };

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const dateKey = tx.transaction_date.substring(0, 7);
    const monthNum = parseInt(tx.transaction_date.substring(5, 7), 10);

    const mSum = monthlyMap.get(dateKey) || {
      key: dateKey,
      label: dateKey,
      shortLabel: dateKey,
      income: 0,
      expenses: 0,
      net: 0,
      gstCollected: 0,
      gstPaid: 0,
      transactionCount: 0,
    };
    mSum.transactionCount++;

    let qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
    if ([7, 8, 9].includes(monthNum)) qKey = 'Q1';
    else if ([10, 11, 12].includes(monthNum)) qKey = 'Q2';
    else if ([1, 2, 3].includes(monthNum)) qKey = 'Q3';
    else if ([4, 5, 6].includes(monthNum)) qKey = 'Q4';

    if (tx.transaction_type === 'income') {
      totalInflow += amt;
      mSum.income += amt;
      quarterMap[qKey].inflow += amt;
    } else {
      totalOutflow += amt;
      mSum.expenses += amt;
      quarterMap[qKey].outflow += amt;
    }

    mSum.net = mSum.income - mSum.expenses;
    monthlyMap.set(dateKey, mSum);
    quarterMap[qKey].net = quarterMap[qKey].inflow - quarterMap[qKey].outflow;
  }

  const netCashFlow = totalInflow - totalOutflow;
  const operatingMargin = totalInflow > 0 ? Math.round((netCashFlow / totalInflow) * 1000) / 10 : 0;

  return {
    filters,
    dateRange,
    kpis: {
      totalInflow,
      totalOutflow,
      netCashFlow,
      operatingMargin,
    },
    monthlyCashFlow: Array.from(monthlyMap.values()),
    quarterlyCashFlow: [quarterMap.Q1, quarterMap.Q2, quarterMap.Q3, quarterMap.Q4],
  };
}

/**
 * 5. Expected vs Actual Rent Reconciliation Report
 */
export async function getRentReconciliationReport(
  filters: FinanceReportFilters
): Promise<RentReconciliationReportDTO> {
  const supabase = await createClient();
  const dateRange = resolveFilterDateRange(filters);

  // 1. Fetch expected schedules in date range
  let schedQuery = supabase
    .from('expected_payment_schedule')
    .select(`
      id,
      lease_id,
      property_id,
      tenant_id,
      due_date,
      amount,
      status,
      property:properties(id, name, address_line_1),
      tenant:tenants(id, first_name, last_name),
      allocations:transaction_schedule_allocations(
        id,
        allocated_amount,
        created_at,
        transaction:transactions(id, amount, transaction_date, reference, status)
      )
    `)
    .gte('due_date', dateRange.start)
    .lte('due_date', dateRange.end)
    .order('due_date', { ascending: true });

  if (filters.workspaceId) {
    schedQuery = schedQuery.eq('workspace_id', filters.workspaceId);
  }

  if (filters.propertyId) {
    schedQuery = schedQuery.eq('property_id', filters.propertyId);
  }

  const { data: rawSchedules, error } = await schedQuery;
  if (error) {
    console.error('Error fetching rent reconciliation schedules:', error);
    throw new Error(`Failed to load rent reconciliation schedules: ${error.message}`);
  }

  let totalExpected = 0;
  let totalReceived = 0;
  let fullyPaidCount = 0;
  let partiallyPaidCount = 0;
  let overdueCount = 0;

  const propMap = new Map<string, PropertyFinancialSummary>();
  const todayStr = new Date().toISOString().split('T')[0];

  const items: RentScheduleReconciliationItem[] = (rawSchedules || []).map((s: any) => {
    const exp = Number(s.amount || 0);
    const paid = (s.allocations || []).reduce(
      (acc: number, a: any) => acc + Number(a.allocated_amount || 0),
      0
    );
    const outstanding = Math.max(0, exp - paid);

    totalExpected += exp;
    totalReceived += paid;

    let derivedStatus: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING' = 'PENDING';
    if (outstanding <= 0.01) {
      derivedStatus = 'PAID';
      fullyPaidCount++;
    } else if (paid > 0) {
      derivedStatus = 'PARTIAL';
      partiallyPaidCount++;
    } else if (s.due_date < todayStr) {
      derivedStatus = 'OVERDUE';
      overdueCount++;
    }

    const pId = s.property?.id || s.property_id || 'unassigned_prop';
    const pName = s.property?.name || s.property?.address_line_1 || 'Unassigned Property';
    const pSum = propMap.get(pId) || {
      propertyId: pId,
      propertyName: pName,
      address: s.property?.address_line_1 || '',
      totalIncome: 0,
      totalExpenses: 0,
      netResult: 0,
      gstCollected: 0,
      gstPaid: 0,
      expectedRent: 0,
      actualRentReceived: 0,
      outstandingRent: 0,
      collectionRate: 100,
      transactionCount: 0,
    };
    pSum.expectedRent += exp;
    pSum.actualRentReceived += paid;
    pSum.outstandingRent += outstanding;
    pSum.collectionRate =
      pSum.expectedRent > 0
        ? Math.min(100, Math.round((pSum.actualRentReceived / pSum.expectedRent) * 1000) / 10)
        : 100;
    propMap.set(pId, pSum);

    const allocs = (s.allocations || []).map((a: any) => ({
      transactionId: a.transaction?.id || '',
      date: a.transaction?.transaction_date || a.created_at,
      amount: Number(a.transaction?.amount || 0),
      allocatedAmount: Number(a.allocated_amount || 0),
    }));

    return {
      scheduleId: s.id,
      leaseId: s.lease_id,
      propertyId: pId,
      propertyName: pName,
      tenantName: s.tenant ? `${s.tenant.first_name || ''} ${s.tenant.last_name || ''}`.trim() : 'Unassigned Tenant',
      dueDate: s.due_date,
      expectedAmount: exp,
      paidAmount: paid,
      outstandingAmount: outstanding,
      status: derivedStatus,
      allocatedTransactions: allocs,
    };
  });

  const totalOutstanding = Math.max(0, totalExpected - totalReceived);
  const collectionRate = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 1000) / 10) : 100;

  return {
    filters,
    dateRange,
    kpis: {
      totalExpected,
      totalReceived,
      totalOutstanding,
      collectionRate,
      scheduleCount: items.length,
      fullyPaidCount,
      partiallyPaidCount,
      overdueCount,
    },
    schedules: items,
    byProperty: Array.from(propMap.values()),
  };
}

/**
 * 6. GST / BAS Reporting Layer
 */
export async function getGstReport(filters: FinanceReportFilters): Promise<GstReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions(filters);
  const fy = filters.financialYear || getCurrentFinancialYear();
  const endYear = parseFinancialYear(fy);
  const startYear = endYear - 1;

  let gstCollected = 0;
  let gstPaidClaimable = 0;
  let totalSalesSubjectToGst = 0;
  let totalPurchasesSubjectToGst = 0;

  const quarters = [
    { quarter: 'Q1', label: `Q1 (${startYear}-07-01 to ${startYear}-09-30)`, dateRange: { start: `${startYear}-07-01`, end: `${startYear}-09-30` }, gstCollected: 0, gstPaid: 0, netGst: 0 },
    { quarter: 'Q2', label: `Q2 (${startYear}-10-01 to ${startYear}-12-31)`, dateRange: { start: `${startYear}-10-01`, end: `${startYear}-12-31` }, gstCollected: 0, gstPaid: 0, netGst: 0 },
    { quarter: 'Q3', label: `Q3 (${endYear}-01-01 to ${endYear}-03-31)`, dateRange: { start: `${endYear}-01-01`, end: `${endYear}-03-31` }, gstCollected: 0, gstPaid: 0, netGst: 0 },
    { quarter: 'Q4', label: `Q4 (${endYear}-04-01 to ${endYear}-06-30)`, dateRange: { start: `${endYear}-04-01`, end: `${endYear}-06-30` }, gstCollected: 0, gstPaid: 0, netGst: 0 },
  ];

  const catMap = new Map<string, CategoryFinancialSummary>();
  const tcMap = new Map<string, TaxClassificationFinancialSummary>();

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);
    const date = tx.transaction_date;

    if (tx.transaction_type === 'income') {
      gstCollected += gst;
      if (gst > 0) totalSalesSubjectToGst += amt;
    } else {
      gstPaidClaimable += gst;
      if (gst > 0) totalPurchasesSubjectToGst += amt;
    }

    // Assign to quarter
    for (const q of quarters) {
      if (date >= q.dateRange.start && date <= q.dateRange.end) {
        if (tx.transaction_type === 'income') {
          q.gstCollected += gst;
        } else {
          q.gstPaid += gst;
        }
        q.netGst = q.gstCollected - q.gstPaid;
      }
    }

    // Category
    const cId = tx.category?.id || 'unassigned_cat';
    const cName = tx.category?.name || 'Unassigned Category';
    const cSum = catMap.get(cId) || {
      categoryId: cId,
      categoryName: cName,
      transactionType: tx.transaction_type,
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    cSum.totalAmount += amt;
    cSum.gstAmount += gst;
    cSum.transactionCount++;
    catMap.set(cId, cSum);

    // Tax Classification
    const tcId = tx.tax_classification?.id || 'unassigned_tc';
    const tcName = tx.tax_classification?.name || 'Standard / Unclassified';
    const tcSum = tcMap.get(tcId) || {
      classificationId: tcId,
      classificationName: tcName,
      basCode: tx.tax_classification?.bas_code,
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    tcSum.totalAmount += amt;
    tcSum.gstAmount += gst;
    tcSum.transactionCount++;
    tcMap.set(tcId, tcSum);
  }

  const netGstPayable = gstCollected - gstPaidClaimable;

  return {
    filters,
    dateRange,
    kpis: {
      gstCollected,
      gstPaidClaimable,
      netGstPayable,
      totalSalesSubjectToGst,
      totalPurchasesSubjectToGst,
      transactionCount: transactions.length,
    },
    basQuarterSummaries: quarters,
    byCategory: Array.from(catMap.values()),
    byTaxClassification: Array.from(tcMap.values()),
    transactions,
  };
}

/**
 * 7. Tax Classification Report
 */
export async function getTaxClassificationReport(
  filters: FinanceReportFilters
): Promise<TaxClassificationReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions(filters);

  let totalClassifiedAmount = 0;
  let deductibleAmount = 0;
  let capitalWorksAmount = 0;
  let depreciatingAssetsAmount = 0;
  let nonDeductibleAmount = 0;
  let unclassifiedAmount = 0;

  const tcMap = new Map<string, TaxClassificationFinancialSummary>();

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);
    totalClassifiedAmount += amt;

    const tcName = tx.tax_classification?.name?.toLowerCase() || '';
    if (!tx.tax_classification_id) {
      unclassifiedAmount += amt;
    } else if (tcName.includes('capital work') || tcName.includes('capital works')) {
      capitalWorksAmount += amt;
    } else if (tcName.includes('depreciat') || tcName.includes('asset')) {
      depreciatingAssetsAmount += amt;
    } else if (tcName.includes('non-deductible') || tcName.includes('private')) {
      nonDeductibleAmount += amt;
    } else {
      deductibleAmount += amt;
    }

    const tcId = tx.tax_classification?.id || 'unclassified';
    const tcLabel = tx.tax_classification?.name || 'Unclassified Transaction';
    const tcSum = tcMap.get(tcId) || {
      classificationId: tcId,
      classificationName: tcLabel,
      basCode: tx.tax_classification?.bas_code,
      totalAmount: 0,
      gstAmount: 0,
      transactionCount: 0,
      percentage: 0,
    };
    tcSum.totalAmount += amt;
    tcSum.gstAmount += gst;
    tcSum.transactionCount++;
    tcMap.set(tcId, tcSum);
  }

  const classifications = Array.from(tcMap.values()).map((tc) => ({
    ...tc,
    percentage: totalClassifiedAmount > 0 ? Math.round((tc.totalAmount / totalClassifiedAmount) * 1000) / 10 : 0,
  }));

  return {
    filters,
    dateRange,
    kpis: {
      totalClassifiedAmount,
      deductibleAmount,
      capitalWorksAmount,
      depreciatingAssetsAmount,
      nonDeductibleAmount,
      unclassifiedAmount,
      transactionCount: transactions.length,
    },
    classifications: classifications.sort((a, b) => b.totalAmount - a.totalAmount),
    transactions,
  };
}

/**
 * 8. Property Performance Report
 */
export async function getPropertyPerformanceReport(
  filters: FinanceReportFilters
): Promise<PropertyPerformanceReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions(filters);
  const propMap = new Map<string, PropertyFinancialSummary>();

  let totalPortfolioIncome = 0;
  let totalPortfolioExpenses = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);

    const pId = tx.property?.id || tx.property_id || 'unassigned_prop';
    const pName = tx.property?.name || tx.property?.address_line_1 || 'Unassigned Property';
    const pSum = propMap.get(pId) || {
      propertyId: pId,
      propertyName: pName,
      address: tx.property?.address_line_1 || '',
      totalIncome: 0,
      totalExpenses: 0,
      netResult: 0,
      gstCollected: 0,
      gstPaid: 0,
      expectedRent: 0,
      actualRentReceived: 0,
      outstandingRent: 0,
      collectionRate: 100,
      transactionCount: 0,
    };
    pSum.transactionCount++;

    if (tx.transaction_type === 'income') {
      totalPortfolioIncome += amt;
      pSum.totalIncome += amt;
      pSum.gstCollected += gst;
    } else {
      totalPortfolioExpenses += amt;
      pSum.totalExpenses += amt;
      pSum.gstPaid += gst;
    }

    pSum.netResult = pSum.totalIncome - pSum.totalExpenses;
    propMap.set(pId, pSum);
  }

  // Load expected rent schedules
  try {
    const supabase = await createClient();
    let schedQ = supabase
      .from('expected_payment_schedule')
      .select(`
        id,
        property_id,
        amount,
        allocations:transaction_schedule_allocations(allocated_amount)
      `)
      .gte('due_date', dateRange.start)
      .lte('due_date', dateRange.end);

    if (filters.workspaceId) {
      schedQ = schedQ.eq('workspace_id', filters.workspaceId);
    }

    const { data: schedules } = (await schedQ) as { data: any[] | null };

    if (schedules) {
      for (const s of schedules) {
        if (s.property_id && propMap.has(s.property_id)) {
          const p = propMap.get(s.property_id)!;
          const exp = Number(s.amount || 0);
          const paid = (s.allocations || []).reduce(
            (acc: number, a: any) => acc + Number(a.allocated_amount || 0),
            0
          );
          p.expectedRent += exp;
          p.actualRentReceived += paid;
          p.outstandingRent = Math.max(0, p.expectedRent - p.actualRentReceived);
          p.collectionRate =
            p.expectedRent > 0
              ? Math.min(100, Math.round((p.actualRentReceived / p.expectedRent) * 1000) / 10)
              : 100;
        }
      }
    }
  } catch (err) {
    console.warn('Could not load schedules for property performance:', err);
  }

  const properties = Array.from(propMap.values()).sort((a, b) => b.totalIncome - a.totalIncome);
  const netPortfolioResult = totalPortfolioIncome - totalPortfolioExpenses;
  const overallCollectionRate = properties.length > 0
    ? Math.round((properties.reduce((acc, p) => acc + p.collectionRate, 0) / properties.length) * 10) / 10
    : 100;

  return {
    filters,
    dateRange,
    kpis: {
      totalPortfolioIncome,
      totalPortfolioExpenses,
      netPortfolioResult,
      overallCollectionRate,
      propertyCount: properties.length,
    },
    properties,
  };
}

/**
 * 9. Transaction Detail Report
 */
export async function getTransactionDetailReport(
  filters: FinanceReportFilters
): Promise<TransactionDetailReportDTO> {
  const { transactions, dateRange } = await fetchFilteredTransactions(filters);

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalGst = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const gst = Number(tx.gst_amount || 0);
    totalGst += gst;

    if (tx.transaction_type === 'income') {
      totalIncome += amt;
    } else {
      totalExpenses += amt;
    }
  }

  return {
    filters,
    dateRange,
    totalCount: transactions.length,
    totalIncome,
    totalExpenses,
    totalGst,
    netAmount: totalIncome - totalExpenses,
    transactions,
  };
}
