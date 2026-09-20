import { CategoryDTO, TransactionType } from '@/modules/finance/domain/types';
import { fetchFormDropdownOptionsAction } from '@/app/actions/finance';
import { fetchDashboardProperties } from '@/app/actions/dashboard';

export interface FormDropdownOptions {
  categories: CategoryDTO[];
  properties: any[];
  leases: any[];
  tenants: any[];
}

export const DEFAULT_FALLBACK_CATEGORIES: CategoryDTO[] = [
  // Expense
  { id: 'cat-exp-insurance', name: 'Insurance', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-repairs', name: 'Repairs & Maintenance', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-rates', name: 'Council Rates', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-water', name: 'Water & Sewerage Rates', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-mgmt', name: 'Property Management Fees', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-strata', name: 'Strata / Body Corporate', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-landtax', name: 'Land Tax', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-cleaning', name: 'Cleaning & Gardening', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-utils', name: 'Utilities (Electricity/Gas)', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-legal', name: 'Legal & Professional Fees', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-adv', name: 'Advertising & Marketing', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-exp-other', name: 'Other Operating Expense', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  // Income
  { id: 'cat-inc-rent', name: 'Rental Income', description: null, transaction_type: 'income', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-inc-bond', name: 'Rental Bond / Deposit', description: null, transaction_type: 'income', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-inc-util', name: 'Utility Reimbursement', description: null, transaction_type: 'income', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-inc-late', name: 'Late Fee / Penalty', description: null, transaction_type: 'income', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-inc-other', name: 'Other Income', description: null, transaction_type: 'income', is_active: true, created_at: '', updated_at: '' },
];

let dropdownCache: FormDropdownOptions | null = null;
let fetchPromise: Promise<FormDropdownOptions> | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 120_000; // 2 minutes

/**
 * Synchronously get currently cached options, or initial fallback so UI has zero delay
 */
export function getCachedDropdownOptionsSync(): FormDropdownOptions {
  if (dropdownCache) {
    return dropdownCache;
  }
  return {
    categories: DEFAULT_FALLBACK_CATEGORIES,
    properties: [],
    leases: [],
    tenants: [],
  };
}

/**
 * Background prewarm cache so dropdown options are available before user clicks
 */
export function prewarmOptionsCache(): Promise<FormDropdownOptions> {
  return getDropdownOptions();
}

/**
 * Main consolidated fetch function with single-roundtrip and auto-refresh
 */
export async function getDropdownOptions(forceRefresh = false): Promise<FormDropdownOptions> {
  const now = Date.now();
  if (dropdownCache && !forceRefresh && now - lastCacheTime < CACHE_TTL) {
    return dropdownCache;
  }

  if (!fetchPromise || forceRefresh) {
    fetchPromise = fetchFormDropdownOptionsAction()
      .then((data) => {
        const mergedCategories =
          data.categories && data.categories.length > 0
            ? data.categories
            : DEFAULT_FALLBACK_CATEGORIES;

        dropdownCache = {
          categories: mergedCategories,
          properties: data.properties || [],
          leases: data.leases || [],
          tenants: data.tenants || [],
        };
        lastCacheTime = Date.now();
        fetchPromise = null;
        return dropdownCache;
      })
      .catch((err) => {
        fetchPromise = null;
        console.error('Failed to load dropdown options from server:', err);
        if (!dropdownCache) {
          dropdownCache = {
            categories: DEFAULT_FALLBACK_CATEGORIES,
            properties: [],
            leases: [],
            tenants: [],
          };
        }
        return dropdownCache;
      });
  }

  return await fetchPromise;
}

export async function getCachedCategories(type?: TransactionType): Promise<CategoryDTO[]> {
  const data = await getDropdownOptions();
  if (type) {
    return (data.categories || []).filter((c) => c.transaction_type === type);
  }
  return data.categories || [];
}

export async function getCachedProperties(): Promise<any[]> {
  const data = await getDropdownOptions();
  return data.properties || [];
}

export async function getCachedLeases(propertyId?: string): Promise<any[]> {
  const data = await getDropdownOptions();
  if (propertyId) {
    return (data.leases || []).filter((l) => l.property_id === propertyId);
  }
  return data.leases || [];
}

export async function getCachedTenants(propertyId?: string): Promise<any[]> {
  const data = await getDropdownOptions();
  if (propertyId) {
    return (data.tenants || []).filter((t) => t.property_id === propertyId);
  }
  return data.tenants || [];
}

export function invalidateOptionsCache() {
  dropdownCache = null;
  fetchPromise = null;
  lastCacheTime = 0;
}
