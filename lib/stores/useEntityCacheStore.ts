'use client';

import { create } from 'zustand';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  workspaceId: string | null;
  propertyId?: string | null;
}

interface EntityCacheState {
  invoices: CacheEntry<any[]> | null;
  properties: CacheEntry<any[]> | null;
  leases: CacheEntry<any[]> | null;
  tenants: CacheEntry<any[]> | null;
  automations: CacheEntry<any[]> | null;
  dashboard: CacheEntry<any> | null;

  setInvoices: (data: any[], workspaceId: string | null) => void;
  setProperties: (data: any[], workspaceId: string | null) => void;
  setLeases: (data: any[], workspaceId: string | null, propertyId?: string | null) => void;
  setTenants: (data: any[], workspaceId: string | null, propertyId?: string | null) => void;
  setAutomations: (data: any[], workspaceId: string | null) => void;
  setDashboard: (data: any, workspaceId: string | null, propertyId?: string | null) => void;

  invalidateAll: () => void;
  invalidateEntity: (entity: 'invoices' | 'properties' | 'leases' | 'tenants' | 'automations' | 'dashboard') => void;
}

export const useEntityCacheStore = create<EntityCacheState>((set) => ({
  invoices: null,
  properties: null,
  leases: null,
  tenants: null,
  automations: null,
  dashboard: null,

  setInvoices: (data, workspaceId) =>
    set({ invoices: { data, timestamp: Date.now(), workspaceId } }),

  setProperties: (data, workspaceId) =>
    set({ properties: { data, timestamp: Date.now(), workspaceId } }),

  setLeases: (data, workspaceId, propertyId) =>
    set({ leases: { data, timestamp: Date.now(), workspaceId, propertyId } }),

  setTenants: (data, workspaceId, propertyId) =>
    set({ tenants: { data, timestamp: Date.now(), workspaceId, propertyId } }),

  setAutomations: (data, workspaceId) =>
    set({ automations: { data, timestamp: Date.now(), workspaceId } }),

  setDashboard: (data, workspaceId, propertyId) =>
    set({ dashboard: { data, timestamp: Date.now(), workspaceId, propertyId } }),

  invalidateAll: () =>
    set({
      invoices: null,
      properties: null,
      leases: null,
      tenants: null,
      automations: null,
      dashboard: null,
    }),

  invalidateEntity: (entity) =>
    set({ [entity]: null } as any),
}));
