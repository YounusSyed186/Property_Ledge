import {
  TransactionDTO,
  BasPeriod,
  BasDateRange,
  BasWorksheetDTO,
  BasWorksheetTotals,
  BasCategoryBreakdownItem,
  BasFigureItem,
  BasGuidanceItem,
  BasTransactionDTO,
} from './types';
import { isIncome, isExpense } from './calculations';

/**
 * Resolves the date range and label for an Australian Financial Year (July 1 to June 30) and BAS period.
 * Example: financialYear = 2026 represents FY 2025-2026 (1 Jul 2025 – 30 Jun 2026).
 */
export function resolveBasDateRange(financialYear: number, period: BasPeriod = 'Q1'): BasDateRange {
  const startYear = financialYear - 1;
  const endYear = financialYear;

  switch (period) {
    case 'Q1':
      return {
        startDate: `${startYear}-07-01`,
        endDate: `${startYear}-09-30`,
        label: `Q1 (Jul ${startYear} – Sep ${startYear})`,
        financialYear,
        period,
      };
    case 'Q2':
      return {
        startDate: `${startYear}-10-01`,
        endDate: `${startYear}-12-31`,
        label: `Q2 (Oct ${startYear} – Dec ${startYear})`,
        financialYear,
        period,
      };
    case 'Q3':
      return {
        startDate: `${endYear}-01-01`,
        endDate: `${endYear}-03-31`,
        label: `Q3 (Jan ${endYear} – Mar ${endYear})`,
        financialYear,
        period,
      };
    case 'Q4':
      return {
        startDate: `${endYear}-04-01`,
        endDate: `${endYear}-06-30`,
        label: `Q4 (Apr ${endYear} – Jun ${endYear})`,
        financialYear,
        period,
      };
    case 'FY':
      return {
        startDate: `${startYear}-07-01`,
        endDate: `${endYear}-06-30`,
        label: `Full Financial Year (1 Jul ${startYear} – 30 Jun ${endYear})`,
        financialYear,
        period,
      };
    default: {
      // Monthly support (M1 = July ... M12 = June)
      if (period.startsWith('M')) {
        const monthNum = parseInt(period.substring(1), 10);
        if (monthNum >= 1 && monthNum <= 6) {
          const calMonth = monthNum + 6; // 7 to 12 (Jul-Dec)
          const lastDay = new Date(startYear, calMonth, 0).getDate();
          const monthStr = String(calMonth).padStart(2, '0');
          return {
            startDate: `${startYear}-${monthStr}-01`,
            endDate: `${startYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
            label: `Month ${monthNum} (${monthStr}/${startYear})`,
            financialYear,
            period,
          };
        } else if (monthNum >= 7 && monthNum <= 12) {
          const calMonth = monthNum - 6; // 1 to 6 (Jan-Jun)
          const lastDay = new Date(endYear, calMonth, 0).getDate();
          const monthStr = String(calMonth).padStart(2, '0');
          return {
            startDate: `${endYear}-${monthStr}-01`,
            endDate: `${endYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
            label: `Month ${monthNum} (${monthStr}/${endYear})`,
            financialYear,
            period,
          };
        }
      }
      // Fallback to Q1
      return {
        startDate: `${startYear}-07-01`,
        endDate: `${startYear}-09-30`,
        label: `Q1 (Jul ${startYear} – Sep ${startYear})`,
        financialYear,
        period: 'Q1',
      };
    }
  }
}

/**
 * Calculates net amount and GST portion from gross amount and GST status.
 * Standard Australian GST is 10% (i.e. GST = 1/11th of GST-inclusive amount).
 */
export function calculateGstPortion(
  amount: number,
  isInclusive: boolean,
  customGstAmount?: number | null
): { net: number; gst: number } {
  const gross = Number(amount) || 0;
  if (gross <= 0) {
    return { net: 0, gst: 0 };
  }

  if (customGstAmount !== undefined && customGstAmount !== null && customGstAmount > 0) {
    const gst = Math.round(Number(customGstAmount) * 100) / 100;
    const net = Math.round(Math.max(0, gross - gst) * 100) / 100;
    return { net, gst };
  }

  if (isInclusive) {
    const net = Math.round((gross / 1.1) * 100) / 100;
    const gst = Math.round((gross - net) * 100) / 100;
    return { net, gst };
  }

  return { net: gross, gst: 0 };
}

/**
 * Aggregates a list of transactions into an Australian BAS Activity Statement Worksheet.
 */
export function calculateBasWorksheet(
  transactions: TransactionDTO[],
  properties: Array<{ id: string; name: string; gst_enabled?: boolean }>,
  options: {
    year: number;
    period: BasPeriod;
    propertyId?: string | null;
  }
): BasWorksheetDTO {
  const { year, period, propertyId } = options;
  const dateRange = resolveBasDateRange(year, period);

  // Determine property display label
  let propertyName = 'All Properties (Portfolio Consolidated)';
  if (propertyId) {
    const matchedProp = properties.find((p) => p.id === propertyId);
    propertyName = matchedProp ? matchedProp.name : 'Selected Property';
  }

  // Filter transactions by date range, completion status, and property (if selected)
  const filtered = transactions.filter((tx) => {
    if (tx.status !== 'completed') return false;
    if (propertyId && tx.property_id !== propertyId) return false;
    const txDate = tx.transaction_date;
    return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
  });

  let totalSales = 0; // G1
  let gstOnSales = 0; // 1A
  let totalExpenses = 0; // Gross expenses
  let gstOnExpenses = 0; // 1B
  let capitalExpensesGross = 0; // G10
  let nonCapitalExpensesGross = 0; // G11
  let unclassifiedCount = 0;

  // Category accumulation maps
  const incomeCategoryMap = new Map<string, BasCategoryBreakdownItem>();
  const expenseCategoryMap = new Map<string, BasCategoryBreakdownItem>();

  for (const tx of filtered) {
    const gross = Number(tx.amount) || 0;
    const isGstInc = Boolean(tx.gst_inclusive);
    const customGst = tx.gst_amount !== undefined && tx.gst_amount !== null ? Number(tx.gst_amount) : undefined;
    const { net, gst } = calculateGstPortion(gross, isGstInc, customGst);

    const categoryId = tx.transaction_category_id || 'uncategorized';
    const categoryName = tx.category?.name || 'Uncategorized';
    const categoryGroup =
      tx.category?.category_group?.name ||
      (isIncome(tx.transaction_type) ? 'Rental & Other Income' : 'Operating Expenses');
    
    // Resolve tax classification & BAS code deterministically
    const explicitTaxClass = tx.tax_classification;
    const defaultTaxClass = tx.category?.default_tax_classification;
    const effectiveTaxClass = explicitTaxClass || defaultTaxClass || null;
    const basCode = effectiveTaxClass?.bas_code || null;

    if (!tx.tax_classification_id && !tx.category?.default_tax_classification_id) {
      unclassifiedCount++;
    }

    if (isIncome(tx.transaction_type)) {
      totalSales += gross;
      gstOnSales += gst;

      const key = `${categoryGroup}__${categoryName}`;
      const existing = incomeCategoryMap.get(key) || {
        categoryId,
        categoryName,
        categoryGroup,
        gross: 0,
        gst: 0,
        net: 0,
        basCode: basCode || 'G1',
        count: 0,
        transactionIds: [],
      };

      existing.gross += gross;
      existing.gst += gst;
      existing.net += net;
      existing.count += 1;
      existing.transactionIds.push(tx.id);
      incomeCategoryMap.set(key, existing);
    } else if (isExpense(tx.transaction_type)) {
      totalExpenses += gross;
      gstOnExpenses += gst;

      // Deterministic Capital (G10) vs Non-Capital (G11/1B) determination via explicit classification
      if (basCode === 'G10') {
        capitalExpensesGross += gross;
      } else {
        nonCapitalExpensesGross += gross;
      }

      const key = `${categoryGroup}__${categoryName}`;
      const existing = expenseCategoryMap.get(key) || {
        categoryId,
        categoryName,
        categoryGroup,
        gross: 0,
        gst: 0,
        net: 0,
        basCode: basCode || '1B',
        count: 0,
        transactionIds: [],
      };

      existing.gross += gross;
      existing.gst += gst;
      existing.net += net;
      existing.count += 1;
      existing.transactionIds.push(tx.id);
      expenseCategoryMap.set(key, existing);
    }
  }

  // Round all totals to 2 decimal places
  const roundedTotals: BasWorksheetTotals = {
    totalSales: Math.round(totalSales * 100) / 100,
    gstOnSales: Math.round(gstOnSales * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    gstOnExpenses: Math.round(gstOnExpenses * 100) / 100,
    netGstPosition: Math.round((gstOnSales - gstOnExpenses) * 100) / 100,
    capitalExpensesGross: Math.round(capitalExpensesGross * 100) / 100,
    nonCapitalExpensesGross: Math.round(nonCapitalExpensesGross * 100) / 100,
  };

  const incomeByCategory = Array.from(incomeCategoryMap.values()).map((item) => ({
    ...item,
    gross: Math.round(item.gross * 100) / 100,
    gst: Math.round(item.gst * 100) / 100,
    net: Math.round(item.net * 100) / 100,
  }));

  const expenseByCategory = Array.from(expenseCategoryMap.values()).map((item) => ({
    ...item,
    gross: Math.round(item.gross * 100) / 100,
    gst: Math.round(item.gst * 100) / 100,
    net: Math.round(item.net * 100) / 100,
  }));

  // Standard BAS Figures with footnote annotations
  const basFigures: BasFigureItem[] = [
    {
      code: 'G1',
      label: 'Total Sales (Gross)',
      amount: roundedTotals.totalSales,
      footnoteSymbol: '¹',
      description: 'Gross sales/revenue including GST, export sales, and GST-free supplies',
    },
    {
      code: '1A',
      label: 'GST on Sales',
      amount: roundedTotals.gstOnSales,
      footnoteSymbol: '²',
      description: 'Total GST collected on taxable sales to be remitted to the ATO',
    },
    {
      code: '1B',
      label: 'GST on Purchases',
      amount: roundedTotals.gstOnExpenses,
      footnoteSymbol: '³',
      description: 'Total GST paid/claimable on business and property operating expenses',
    },
    {
      code: 'NET',
      label: 'Net GST Position',
      amount: roundedTotals.netGstPosition,
      footnoteSymbol: '⁴',
      description: 'Net GST amount (Positive: Payment to ATO; Negative: Refund from ATO)',
    },
  ];

  return {
    propertyName,
    propertyId: propertyId || null,
    financialYear: year,
    period,
    periodLabel: dateRange.label,
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    totals: roundedTotals,
    incomeByCategory,
    expenseByCategory,
    basFigures,
    unclassifiedCount,
    totalTransactionsCount: filtered.length,
  };
}

/**
 * Transforms transactions into enriched audit trail records for the Details tab.
 */
export function formatBasDetailsTransactions(
  transactions: TransactionDTO[],
  options: {
    year: number;
    period: BasPeriod;
    propertyId?: string | null;
  }
): BasTransactionDTO[] {
  const { year, period, propertyId } = options;
  const dateRange = resolveBasDateRange(year, period);

  return transactions
    .filter((tx) => {
      if (tx.status !== 'completed') return false;
      if (propertyId && tx.property_id !== propertyId) return false;
      const txDate = tx.transaction_date;
      return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
    })
    .map((tx) => {
      const gross = Number(tx.amount) || 0;
      const isGstInc = Boolean(tx.gst_inclusive);
      const customGst = tx.gst_amount !== undefined && tx.gst_amount !== null ? Number(tx.gst_amount) : undefined;
      const { net, gst } = calculateGstPortion(gross, isGstInc, customGst);

      const categoryGroup =
        tx.category?.category_group?.name ||
        (isIncome(tx.transaction_type) ? 'Income' : 'Expenses');
      const effectiveTaxClass = tx.tax_classification || tx.category?.default_tax_classification || null;
      const taxClassification = effectiveTaxClass?.name || 'Standard';
      const basCode =
        effectiveTaxClass?.bas_code ||
        (isIncome(tx.transaction_type) ? 'G1' : '1B');

      return {
        id: tx.id,
        date: tx.transaction_date,
        description: tx.description || (isIncome(tx.transaction_type) ? 'Rental Income' : 'Property Expense'),
        type: tx.transaction_type,
        category: tx.category?.name || 'General',
        categoryGroup,
        taxClassification,
        propertyName: tx.property?.name || 'Property',
        amount: gross,
        gstAmount: gst,
        netAmount: net,
        gstInclusive: isGstInc,
        basCode,
        reference: tx.reference,
        status: tx.status,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Builds step-by-step ATO BAS guidance table items from calculated worksheet data.
 */
export function buildBasGuidance(worksheet: BasWorksheetDTO): BasGuidanceItem[] {
  const isPayable = worksheet.totals.netGstPosition >= 0;

  return [
    {
      basField: 'G1 – Total sales',
      ledgeLabel: 'Total Sales (Gross)',
      amount: worksheet.totals.totalSales,
      explanation:
        'Enter total gross income received across your portfolio during this period (including GST, GST-free rent, and recoveries).',
      footnoteSymbol: '¹',
    },
    {
      basField: '1A – GST on sales',
      ledgeLabel: 'GST Collected',
      amount: worksheet.totals.gstOnSales,
      explanation:
        'Enter total GST collected from commercial rent or taxable income. On the official ATO form, this is 1/11th of your taxable sales.',
      footnoteSymbol: '²',
    },
    {
      basField: 'Total Expenses ( purchases )',
      ledgeLabel: 'Total Operating Expenses',
      amount: worksheet.totals.totalExpenses,
      explanation:
        'Total gross purchases and expenses incurred for your properties (informational reconciliation figure).',
    },
    {
      basField: '1B – GST on purchases',
      ledgeLabel: 'GST Paid / Input Credits',
      amount: worksheet.totals.gstOnExpenses,
      explanation:
        'Enter total GST included in your allowable property operating expenses and capital works (Input Tax Credits).',
      footnoteSymbol: '³',
    },
    {
      basField: isPayable ? 'Net GST Payable' : 'Net GST Refundable',
      ledgeLabel: 'Net GST Position (1A – 1B)',
      amount: Math.abs(worksheet.totals.netGstPosition),
      explanation: isPayable
        ? `You owe $${worksheet.totals.netGstPosition.toFixed(2)} to the ATO for this period. Transfer this into the payment section of your BAS.`
        : `You are entitled to a refund of $${Math.abs(worksheet.totals.netGstPosition).toFixed(2)} from the ATO for this period.`,
      footnoteSymbol: '⁴',
    },
  ];
}
