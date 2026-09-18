import { CategoryDTO, TransactionType } from '@/modules/finance/domain/types';
import { fetchCategoriesAction } from '@/app/actions/finance';
import { fetchDashboardProperties } from '@/app/actions/dashboard';

let categoriesCache: CategoryDTO[] | null = null;
let propertiesCache: any[] | null = null;
let categoriesFetchPromise: Promise<CategoryDTO[]> | null = null;
let propertiesFetchPromise: Promise<any[]> | null = null;

export async function getCachedCategories(type?: TransactionType): Promise<CategoryDTO[]> {
  if (categoriesCache) {
    // Return cached immediately and refresh in background
    fetchCategoriesAction(type).then((data) => {
      if (data && data.length > 0) categoriesCache = data;
    }).catch(() => {});
    
    if (type) {
      return categoriesCache.filter((c) => c.transaction_type === type);
    }
    return categoriesCache;
  }

  if (!categoriesFetchPromise) {
    categoriesFetchPromise = fetchCategoriesAction().then((data) => {
      categoriesCache = data || [];
      categoriesFetchPromise = null;
      return categoriesCache;
    }).catch((err) => {
      categoriesFetchPromise = null;
      throw err;
    });
  }

  const all = await categoriesFetchPromise;
  if (type) {
    return all.filter((c) => c.transaction_type === type);
  }
  return all;
}

export async function getCachedProperties(): Promise<any[]> {
  if (propertiesCache) {
    // Return cached immediately and refresh in background
    fetchDashboardProperties().then((data) => {
      if (data && data.length > 0) propertiesCache = data;
    }).catch(() => {});
    return propertiesCache;
  }

  if (!propertiesFetchPromise) {
    propertiesFetchPromise = fetchDashboardProperties().then((data) => {
      propertiesCache = data || [];
      propertiesFetchPromise = null;
      return propertiesCache;
    }).catch((err) => {
      propertiesFetchPromise = null;
      throw err;
    });
  }

  return await propertiesFetchPromise;
}

export function invalidateOptionsCache() {
  categoriesCache = null;
  propertiesCache = null;
}
