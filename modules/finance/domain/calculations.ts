import {
  TransactionDTO,
  LedgerEntryDTO,
  FinancialSummaryDTO,
  CategoryBreakdownItem,
  MonthlyFinancialTrend,
} from './types';

/**
 * Checks if a transaction type is income
 */
export function isIncome(type: string | null | undefined): boolean {
  return type === 'income';
}

/**
 * Checks if a transaction type is expense
 */
export function isExpense(type: string | null | undefined): boolean {
  return type === 'expense';
}

/**
 * Returns the Money In value (positive amount for income, 0 for expenses)
 */
export function calculateMoneyIn(amount: number, type: string): number {
  return isIncome(type) ? Math.abs(amount) : 0;
}

/**
 * Returns the Money Out value (positive amount for expenses, 0 for income)
 */
export function calculateMoneyOut(amount: number, type: string): number {
  return isExpense(type) ? Math.abs(amount) : 0;
}

/**
 * Calculates a dynamic ledger view from a list of transactions with running balance.
 * Transactions should be sorted chronologically (ascending) for accurate running balance.
 */
export function calculateLedger(
  transactions: TransactionDTO[],
  initialBalance = 0
): LedgerEntryDTO[] {
  // Sort chronologically (oldest to newest)
  const sorted = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transaction_date).getTime();
    const dateB = new Date(b.transaction_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  let currentBalance = initialBalance;

  return sorted.map((tx) => {
    const isCompleted = tx.status === 'completed';
    const moneyIn = isCompleted && isIncome(tx.transaction_type) ? Number(tx.amount) : 0;
    const moneyOut = isCompleted && isExpense(tx.transaction_type) ? Number(tx.amount) : 0;

    currentBalance = currentBalance + moneyIn - moneyOut;

    return {
      id: tx.id,
      transaction: tx,
      date: tx.transaction_date,
      description: tx.description || (isIncome(tx.transaction_type) ? 'Income' : 'Expense'),
      transaction_type: tx.transaction_type,
      category_name: tx.category?.name || 'Uncategorized',
      property_name: tx.property?.name || 'Unknown Property',
      reference: tx.reference,
      money_in: isIncome(tx.transaction_type) ? Number(tx.amount) : 0,
      money_out: isExpense(tx.transaction_type) ? Number(tx.amount) : 0,
      running_balance: currentBalance,
      status: tx.status,
    };
  });
}

/**
 * Centralized financial overview & KPI calculations.
 * Consistent across Dashboard, Ledger, and Reports.
 */
export function calculateFinancialSummary(transactions: TransactionDTO[]): FinancialSummaryDTO {
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingAmount = 0;

  const incomeCatMap = new Map<string, { id: string; name: string; amount: number; count: number }>();
  const expenseCatMap = new Map<string, { id: string; name: string; amount: number; count: number }>();
  const monthlyTrendMap = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    const catId = tx.transaction_category_id;
    const catName = tx.category?.name || 'General';
    const monthKey = tx.transaction_date.substring(0, 7); // "YYYY-MM"

    if (!monthlyTrendMap.has(monthKey)) {
      monthlyTrendMap.set(monthKey, { income: 0, expense: 0 });
    }
    const trend = monthlyTrendMap.get(monthKey)!;

    if (tx.status === 'completed') {
      if (isIncome(tx.transaction_type)) {
        totalIncome += amount;
        trend.income += amount;

        const current = incomeCatMap.get(catId) || { id: catId, name: catName, amount: 0, count: 0 };
        current.amount += amount;
        current.count += 1;
        incomeCatMap.set(catId, current);
      } else if (isExpense(tx.transaction_type)) {
        totalExpense += amount;
        trend.expense += amount;

        const current = expenseCatMap.get(catId) || { id: catId, name: catName, amount: 0, count: 0 };
        current.amount += amount;
        current.count += 1;
        expenseCatMap.set(catId, current);
      }
    } else if (tx.status === 'pending') {
      pendingAmount += amount;
    }
  }

  // Format category breakdowns
  const income_by_category: CategoryBreakdownItem[] = Array.from(incomeCatMap.values())
    .map((item) => ({
      category_id: item.id,
      name: item.name,
      transaction_type: 'income' as const,
      amount: item.amount,
      percentage: totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0,
      count: item.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expense_by_category: CategoryBreakdownItem[] = Array.from(expenseCatMap.values())
    .map((item) => ({
      category_id: item.id,
      name: item.name,
      transaction_type: 'expense' as const,
      amount: item.amount,
      percentage: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0,
      count: item.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Format monthly trends sorted chronologically
  const monthly_trend: MonthlyFinancialTrend[] = Array.from(monthlyTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }));

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_profit: totalIncome - totalExpense,
    pending_amount: pendingAmount,
    transaction_count: transactions.length,
    income_by_category,
    expense_by_category,
    monthly_trend,
  };
}
