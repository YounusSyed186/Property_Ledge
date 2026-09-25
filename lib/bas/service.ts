import { createClient } from '@/lib/supabase/server';
import {
  TransactionDTO,
  BasPeriod,
  BasWorksheetDTO,
  BasTransactionDTO,
  BasGuidanceItem,
  TaxClassificationDTO,
  CategoryGroupDTO,
} from '@/modules/finance/domain/types';
import {
  resolveBasDateRange,
  calculateBasWorksheet,
  formatBasDetailsTransactions,
  buildBasGuidance,
} from '@/modules/finance/domain/bas-calculations';

export interface BasPageData {
  worksheet: BasWorksheetDTO;
  details: BasTransactionDTO[];
  guidance: BasGuidanceItem[];
  properties: Array<{
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
    gst_enabled?: boolean;
  }>;
  taxClassifications: TaxClassificationDTO[];
  categoryGroups: CategoryGroupDTO[];
  availableYears: number[];
}

export const DEFAULT_CATEGORY_GROUPS = [
  { id: 'cg-1', name: 'Rental Income', description: 'Gross residential and commercial rental revenue' },
  { id: 'cg-2', name: 'Other Revenue', description: 'Sundry and miscellaneous property income' },
  { id: 'cg-3', name: 'Operating Expenses', description: 'Allowable property operating expenses' },
  { id: 'cg-4', name: 'Repairs & Maintenance', description: 'Repairs, servicing and emergency maintenance' },
  { id: 'cg-5', name: 'Capital Works & Acquisitions', description: 'Capital improvements and depreciable assets (G10)' },
  { id: 'cg-6', name: 'Statutory Levies & Rates', description: 'Council rates, water rates, and land tax' },
];

export const DEFAULT_TAX_CLASSIFICATIONS = [
  // Exact 9 Tax Classifications for expenses (Part 17)
  { id: 'tc-repair-maint', name: 'Repair & Maintenance', bas_code: '1B', description: 'Repairs and recurring maintenance to existing assets', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-initial-repair', name: 'Initial Repair', bas_code: 'G10', description: 'Repairs made immediately after acquisition (capital in nature)', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-capital-works', name: 'Capital Works', bas_code: 'G10', description: 'Structural additions, alterations, and improvements (Div 43)', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-depreciating-asset', name: 'Depreciating Asset', bas_code: 'G10', description: 'Plant and equipment assets subject to decline in value (Div 40)', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-borrowing-expense', name: 'Borrowing Expense', bas_code: null, description: 'Loan establishment, mortgage documentation, and borrowing fees', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-other-deductible', name: 'Other Deductible Expense', bas_code: '1B', description: 'Rates, insurance, management fees, and general deductions', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-non-deductible', name: 'Non-Deductible Expense', bas_code: null, description: 'Fines, penalties, and non-claimable expenditures', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-private-personal', name: 'Private / Personal', bas_code: null, description: 'Owner private proportion and non-business items', applies_to: 'expense' as const, is_active: true },
  { id: 'tc-cgt-capital', name: 'CGT / Capital Expense', bas_code: 'G10', description: 'Cost base additions and non-depreciable capital items', applies_to: 'expense' as const, is_active: true },
  // Income classifications
  { id: 'tc-taxable-sales', name: 'Taxable Sales (10% GST)', bas_code: 'G1', description: 'Standard commercial rent and taxable supplies', applies_to: 'income' as const, is_active: true },
  { id: 'tc-gst-free-income', name: 'GST-Free Rental Income', bas_code: 'G1', description: 'Residential rent (input taxed / GST-free)', applies_to: 'income' as const, is_active: true },
];

/**
 * Ensures default tax classifications and category groups exist for the workspace.
 * Automatically seeds standard Australian ATO tax classifications if empty.
 */
export async function ensureDefaultTaxClassifications(workspaceId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: existingGroups, error: groupErr } = await supabase
      .from('category_groups')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (!groupErr && (!existingGroups || existingGroups.length === 0)) {
      const defaultGroups = DEFAULT_CATEGORY_GROUPS.map((g) => ({
        workspace_id: workspaceId,
        name: g.name,
        description: g.description,
      }));
      await supabase.from('category_groups').insert(defaultGroups as never);
    }

    const { data: existingClassifications, error: classErr } = await supabase
      .from('tax_classifications')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (!classErr && (!existingClassifications || existingClassifications.length === 0)) {
      const defaultClassifications = DEFAULT_TAX_CLASSIFICATIONS.map((t) => ({
        workspace_id: workspaceId,
        name: t.name,
        bas_code: t.bas_code,
        description: t.description,
        applies_to: t.applies_to,
        is_active: true,
      }));
      await supabase.from('tax_classifications').insert(defaultClassifications as never);
    }
  } catch (err) {
    console.warn('Silent fallback: Database table migration may still be applying:', err);
  }
}

/**
 * Fetch all properties for the workspace including GST tracking status.
 */
export async function getWorkspaceProperties(workspaceId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address_line_1, city, state, gst_enabled')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      // Fallback query if gst_enabled is not yet selected
      const fallback = await supabase
        .from('properties')
        .select('id, name, address_line_1, city, state')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true });
      return (fallback.data || []).map((p: any) => ({ ...p, gst_enabled: false }));
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching workspace properties for BAS:', err);
    return [];
  }
}

/**
 * Fetch all tax classifications for the workspace.
 */
export async function getTaxClassifications(workspaceId: string): Promise<TaxClassificationDTO[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tax_classifications')
      .select('id, workspace_id, name, bas_code, description, applies_to, is_active, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_TAX_CLASSIFICATIONS.map((t) => ({
        ...t,
        workspace_id: workspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as TaxClassificationDTO[];
    }
    return data as TaxClassificationDTO[];
  } catch {
    return DEFAULT_TAX_CLASSIFICATIONS.map((t) => ({
      ...t,
      workspace_id: workspaceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as TaxClassificationDTO[];
  }
}

/**
 * Fetch all category groups for the workspace.
 */
export async function getCategoryGroups(workspaceId: string): Promise<CategoryGroupDTO[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('category_groups')
      .select('id, workspace_id, name, description, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_CATEGORY_GROUPS.map((g) => ({
        ...g,
        workspace_id: workspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as CategoryGroupDTO[];
    }
    return data as CategoryGroupDTO[];
  } catch {
    return DEFAULT_CATEGORY_GROUPS.map((g) => ({
      ...g,
      workspace_id: workspaceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as CategoryGroupDTO[];
  }
}

/**
 * Helper to match category to a category group name if foreign key is not set
 */
function inferCategoryGroupName(categoryName?: string, transactionType?: string): string {
  if (!categoryName) return transactionType === 'income' ? 'Rental Income' : 'Operating Expenses';
  const lower = categoryName.toLowerCase();
  if (lower.includes('rent')) return 'Rental Income';
  if (lower.includes('maintenance') || lower.includes('repair') || lower.includes('service')) return 'Repairs & Maintenance';
  if (lower.includes('rate') || lower.includes('tax') || lower.includes('council') || lower.includes('water')) return 'Statutory Levies & Rates';
  if (lower.includes('capital') || lower.includes('improvement') || lower.includes('renovat')) return 'Capital Works & Acquisitions';
  if (transactionType === 'income') return 'Rental Income';
  return 'Operating Expenses';
}

/**
 * Fetches transactions within the BAS date range with full relations.
 */
export async function getBasLedgerTransactions(params: {
  workspaceId: string;
  propertyId?: string | null;
  year: number;
  period: BasPeriod;
  categoryGroups?: CategoryGroupDTO[];
}): Promise<TransactionDTO[]> {
  const { workspaceId, propertyId, year, period, categoryGroups = [] } = params;
  const dateRange = resolveBasDateRange(year, period);
  const supabase = await createClient();

  try {
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
        category:categories(
          id,
          transaction_type,
          name,
          description,
          is_active,
          category_group_id
        ),
        tax_classification:tax_classifications(
          id,
          workspace_id,
          name,
          bas_code,
          description,
          is_active
        ),
        property:properties(id, name, address_line_1, city, state, gst_enabled)
      `)
      .eq('workspace_id', workspaceId)
      .gte('transaction_date', dateRange.startDate)
      .lte('transaction_date', dateRange.endDate)
      .order('transaction_date', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Full transaction query warning, falling back to basic join:', error.message);
      // Fallback query if new columns/relationships are partially loaded
      let fallbackQuery = supabase
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
          category:categories(id, transaction_type, name, description, is_active),
          property:properties(id, name, address_line_1, city, state)
        `)
        .eq('workspace_id', workspaceId)
        .gte('transaction_date', dateRange.startDate)
        .lte('transaction_date', dateRange.endDate)
        .order('transaction_date', { ascending: false });

      if (propertyId) {
        fallbackQuery = fallbackQuery.eq('property_id', propertyId);
      }

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        console.error('Error fetching fallback BAS transactions:', fallbackRes.error);
        return [];
      }

      // Enrich with default GST & category groups
      return (fallbackRes.data || []).map((t: any) => {
        const groupName = inferCategoryGroupName(t.category?.name, t.transaction_type);
        return {
          ...t,
          gst_inclusive: false,
          gst_amount: 0,
          tax_classification_id: null,
          category: t.category
            ? {
                ...t.category,
                category_group: { id: 'inferred', name: groupName },
              }
            : null,
          property: t.property
            ? { ...t.property, gst_enabled: false }
            : null,
        };
      }) as TransactionDTO[];
    }

    // Map and enrich transactions with category groups
    const groupMap = new Map(categoryGroups.map((g) => [g.id, g]));

    return (data || []).map((t: any) => {
      let catGroup = t.category?.category_group;
      if (!catGroup && t.category?.category_group_id && groupMap.has(t.category.category_group_id)) {
        catGroup = groupMap.get(t.category.category_group_id);
      }
      if (!catGroup) {
        const groupName = inferCategoryGroupName(t.category?.name, t.transaction_type);
        catGroup = { id: 'inferred', name: groupName };
      }

      return {
        ...t,
        category: t.category
          ? {
              ...t.category,
              category_group: catGroup,
            }
          : null,
      };
    }) as TransactionDTO[];
  } catch (err) {
    console.error('Failed to getBasLedgerTransactions:', err);
    return [];
  }
}

/**
 * Consolidated single-pass retrieval of all BAS page models (Worksheet, Details, Guidance, Lookups).
 */
export async function getBasPageData(params: {
  workspaceId: string;
  propertyId?: string | null;
  financialYear: number;
  period: BasPeriod;
}): Promise<BasPageData> {
  const { workspaceId, propertyId, financialYear, period } = params;

  // Auto-seed defaults if needed
  await ensureDefaultTaxClassifications(workspaceId);

  const [properties, taxClassifications, categoryGroups] = await Promise.all([
    getWorkspaceProperties(workspaceId),
    getTaxClassifications(workspaceId),
    getCategoryGroups(workspaceId),
  ]);

  const transactions = await getBasLedgerTransactions({
    workspaceId,
    propertyId,
    year: financialYear,
    period,
    categoryGroups,
  });

  const worksheet = calculateBasWorksheet(transactions, properties, {
    year: financialYear,
    period,
    propertyId,
  });

  const details = formatBasDetailsTransactions(transactions, {
    year: financialYear,
    period,
    propertyId,
  });

  const guidance = buildBasGuidance(worksheet);

  // Available Australian Financial Years (e.g. FY2024 to FY2028)
  const currentCalYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentFY = currentMonth >= 7 ? currentCalYear + 1 : currentCalYear;
  const availableYears = [currentFY + 1, currentFY, currentFY - 1, currentFY - 2];

  return {
    worksheet,
    details,
    guidance,
    properties,
    taxClassifications,
    categoryGroups,
    availableYears,
  };
}
