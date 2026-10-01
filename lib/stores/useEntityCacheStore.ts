'use client';

import { create } from 'zustand';

export interface CachedData<T> {
  data: T;
  fetchedAt: number;
  timestamp: number; // backward compatibility
  isRefreshing: boolean;
  error: string | null;
  workspaceId: string | null;
  propertyId?: string | null;
}

export type FreshnessTier = 'live' | 'normal' | 'stable';

export const FRESHNESS_THRESHOLDS: Record<FreshnessTier, number> = {
  live: 5000,       // 5 seconds for near-live dashboard stats/transactions
  normal: 30000,    // 30 seconds for properties, leases, tenants
  stable: 300000,   // 5 minutes for settings, roles, metadata
};

interface EntityCacheState {
  invoices: CachedData<any[]> | null;
  properties: CachedData<any[]> | null;
  leases: CachedData<any[]> | null;
  tenants: CachedData<any[]> | null;
  automations: CachedData<any[]> | null;
  dashboard: CachedData<any> | null;
  cacheMap: Record<string, CachedData<any>>;

  setInvoices: (data: any[], workspaceId: string | null, isRefreshing?: boolean, error?: string | null) => void;
  setProperties: (data: any[], workspaceId: string | null, isRefreshing?: boolean, error?: string | null) => void;
  setLeases: (data: any[], workspaceId: string | null, propertyId?: string | null, isRefreshing?: boolean, error?: string | null) => void;
  setTenants: (data: any[], workspaceId: string | null, propertyId?: string | null, isRefreshing?: boolean, error?: string | null) => void;
  setAutomations: (data: any[], workspaceId: string | null, isRefreshing?: boolean, error?: string | null) => void;
  setDashboard: (data: any, workspaceId: string | null, propertyId?: string | null, isRefreshing?: boolean, error?: string | null) => void;

  setDashboardRefreshing: (isRefreshing: boolean) => void;
  setDashboardError: (error: string | null) => void;

  setKeyedData: <T>(key: string, data: T, workspaceId: string | null, propertyId?: string | null) => void;
  setKeyedRefreshing: (key: string, isRefreshing: boolean) => void;
  setKeyedError: (key: string, error: string | null) => void;

  invalidateAll: () => void;
  invalidateEntity: (entity: 'invoices' | 'properties' | 'leases' | 'tenants' | 'automations' | 'dashboard') => void;
  invalidateKeyPrefix: (prefix: string) => void;
}

function makeCacheEntry<T>(
  data: T,
  workspaceId: string | null,
  propertyId?: string | null,
  isRefreshing = false,
  error: string | null = null,
  existingFetchedAt?: number
): CachedData<T> {
  const now = existingFetchedAt ?? Date.now();
  return {
    data,
    fetchedAt: now,
    timestamp: now,
    isRefreshing,
    error,
    workspaceId,
    propertyId: propertyId ?? null,
  };
}

export const useEntityCacheStore = create<EntityCacheState>((set) => ({
  invoices: null,
  properties: null,
  leases: null,
  tenants: null,
  automations: null,
  dashboard: null,
  cacheMap: {},

  setInvoices: (data, workspaceId, isRefreshing = false, error = null) =>
    set({ invoices: makeCacheEntry(data, workspaceId, null, isRefreshing, error) }),

  setProperties: (data, workspaceId, isRefreshing = false, error = null) =>
    set({ properties: makeCacheEntry(data, workspaceId, null, isRefreshing, error) }),

  setLeases: (data, workspaceId, propertyId, isRefreshing = false, error = null) =>
    set({ leases: makeCacheEntry(data, workspaceId, propertyId, isRefreshing, error) }),

  setTenants: (data, workspaceId, propertyId, isRefreshing = false, error = null) =>
    set({ tenants: makeCacheEntry(data, workspaceId, propertyId, isRefreshing, error) }),

  setAutomations: (data, workspaceId, isRefreshing = false, error = null) =>
    set({ automations: makeCacheEntry(data, workspaceId, null, isRefreshing, error) }),

  setDashboard: (data, workspaceId, propertyId, isRefreshing = false, error = null) =>
    set((state) => {
      const entry = makeCacheEntry(data, workspaceId, propertyId, isRefreshing, error);
      const key = buildCacheKey('dashboard', workspaceId, propertyId);
      return {
        dashboard: entry,
        cacheMap: { ...state.cacheMap, [key]: entry },
      };
    }),

  setDashboardRefreshing: (isRefreshing: boolean) =>
    set((state) => {
      if (!state.dashboard) return state;
      const updated = { ...state.dashboard, isRefreshing };
      const key = buildCacheKey('dashboard', state.dashboard.workspaceId, state.dashboard.propertyId);
      return {
        dashboard: updated,
        cacheMap: { ...state.cacheMap, [key]: updated },
      };
    }),

  setDashboardError: (error: string | null) =>
    set((state) => {
      if (!state.dashboard) return state;
      const updated = { ...state.dashboard, isRefreshing: false, error };
      const key = buildCacheKey('dashboard', state.dashboard.workspaceId, state.dashboard.propertyId);
      return {
        dashboard: updated,
        cacheMap: { ...state.cacheMap, [key]: updated },
      };
    }),

  setKeyedData: (key, data, workspaceId, propertyId) =>
    set((state) => ({
      cacheMap: {
        ...state.cacheMap,
        [key]: makeCacheEntry(data, workspaceId, propertyId, false, null),
      },
    })),

  setKeyedRefreshing: (key, isRefreshing) =>
    set((state) => {
      const existing = state.cacheMap[key];
      if (!existing) return state;
      return {
        cacheMap: {
          ...state.cacheMap,
          [key]: { ...existing, isRefreshing },
        },
      };
    }),

  setKeyedError: (key, error) =>
    set((state) => {
      const existing = state.cacheMap[key];
      if (!existing) return state;
      return {
        cacheMap: {
          ...state.cacheMap,
          [key]: { ...existing, isRefreshing: false, error },
        },
      };
    }),

  invalidateAll: () =>
    set({
      invoices: null,
      properties: null,
      leases: null,
      tenants: null,
      automations: null,
      dashboard: null,
      cacheMap: {},
    }),

  invalidateEntity: (entity) =>
    set((state) => {
      const newCacheMap = { ...state.cacheMap };
      Object.keys(newCacheMap).forEach((k) => {
        if (k.startsWith(`${entity}:`)) {
          delete newCacheMap[k];
        }
      });
      return {
        [entity]: null,
        cacheMap: newCacheMap,
      } as any;
    }),

  invalidateKeyPrefix: (prefix: string) =>
    set((state) => {
      const newCacheMap = { ...state.cacheMap };
      Object.keys(newCacheMap).forEach((k) => {
        if (k.startsWith(prefix)) {
          delete newCacheMap[k];
        }
      });
      return { cacheMap: newCacheMap };
    }),
}));

// In-Flight Request Deduplication Registry
const inFlightRequests = new Map<string, Promise<any>>();

export async function fetchWithDeduplication<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

export function isDataFresh(
  entry: { fetchedAt?: number; timestamp?: number } | null | undefined,
  thresholdMs = FRESHNESS_THRESHOLDS.live
): boolean {
  if (!entry) return false;
  const time = entry.fetchedAt ?? entry.timestamp ?? 0;
  if (!time) return false;
  return Date.now() - time < thresholdMs;
}

export function formatLastUpdated(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 3) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

export function buildCacheKey(
  entity: string,
  workspaceId: string | null | undefined,
  propertyId?: string | null | undefined,
  extra?: string
): string {
  const ws = workspaceId || 'all';
  const prop = propertyId || 'all';
  return extra ? `${entity}:${ws}:${prop}:${extra}` : `${entity}:${ws}:${prop}`;
}
