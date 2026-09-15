export interface PredefinedLedgerTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  brandColor: string;
  accentColor: string;
  layoutStyle: 'executive' | 'tax_schedule' | 'general_ledger' | 'quarterly_bas' | 'property_matrix';
  bestFor: string;
  features: string[];
}

export const PREDEFINED_LEDGER_TEMPLATES: PredefinedLedgerTemplate[] = [
  {
    id: 'template_executive',
    name: 'Executive Cashflow Statement',
    badge: 'Executive / Investor',
    description: 'A clean, modern executive statement summarizing revenue, operating expenses, net yield, and monthly cash flow trends.',
    brandColor: '#008F83',
    accentColor: '#E6F4F2',
    layoutStyle: 'executive',
    bestFor: 'Owner monthly updates, investor reviews, portfolio performance overviews',
    features: [
      'Executive Summary KPI Cards (Money In, Money Out, Net Cashflow)',
      'Monthly Inflow vs Outflow Trend Bar Chart Matrix',
      'Category Distribution Breakdown',
      'Chronological Recent Transactions Statement',
    ],
  },
  {
    id: 'template_ato_tax',
    name: 'ATO / EOFY Tax-Ready Schedule',
    badge: 'ATO Tax Compliant',
    description: 'Structured specifically according to Australian Tax Office rental property schedules (Council Rates, Water, Repairs, Capital Works, Property Management).',
    brandColor: '#1E3A8A',
    accentColor: '#EFF6FF',
    layoutStyle: 'tax_schedule',
    bestFor: 'Australian EOFY tax return filing, CPA review, tax deduction claims',
    features: [
      'ATO Standard Rental Schedule Category Alignment',
      'Operating Repairs vs Capital Works Separation',
      'Deductible Expenses Subtotals & Net Taxable Position',
      'Accountant Sign-Off & Declaration Section',
    ],
  },
  {
    id: 'template_accountant_ledger',
    name: "Accountant's General Ledger",
    badge: 'Double-Entry / Audit',
    description: 'Complete chronological audit ledger with running balance, debit/credit columns, payment methods, and invoice/reference numbers.',
    brandColor: '#334155',
    accentColor: '#F1F5F9',
    layoutStyle: 'general_ledger',
    bestFor: 'Bookkeeper reconciliation, Xero/MYOB audit verification, trust accounting',
    features: [
      'Continuous Running Balance Calculation',
      'Detailed Debit (Out) & Credit (In) Columns',
      'Payment Method & Cleared Reconciliation Status',
      'Complete Invoice and Reference Number Auditing',
    ],
  },
  {
    id: 'template_quarterly_bas',
    name: 'Quarterly BAS Statement',
    badge: 'Quarterly BAS',
    description: 'Quarter-by-quarter comparison matrix (Q1, Q2, Q3, Q4) showing seasonal cashflow, quarterly variance, and GST-ready figures.',
    brandColor: '#0D9488',
    accentColor: '#F0FDFA',
    layoutStyle: 'quarterly_bas',
    bestFor: 'Quarterly Business Activity Statements, GST tracking, quarterly budgeting',
    features: [
      '4-Quarter Comparative Cashflow Matrix (Q1, Q2, Q3, Q4)',
      'Quarterly Inflow vs Outflow Variance Analysis',
      'Net Profit / Loss Progression',
      'Quarterly Operating Ratio Diagnostics',
    ],
  },
  {
    id: 'template_property_breakdown',
    name: 'Property Performance Matrix',
    badge: 'Multi-Property Matrix',
    description: 'Multi-property comparative report detailing income, outgoings, and net yield broken down across individual properties in your portfolio.',
    brandColor: '#7C3AED',
    accentColor: '#F5F3FF',
    layoutStyle: 'property_matrix',
    bestFor: 'Multi-property owners, comparing property yields, asset management',
    features: [
      'Property-by-Property Revenue & Expense Comparison',
      'Individual Property Net Cashflow Ranking',
      'Per-Property Category Breakdown Matrix',
      'Vacancy & Tenancy Linked Activity Overview',
    ],
  },
];
