'use client';

import React, { createContext, useContext } from 'react';
import type { EntitlementMap } from '@/types/subscriptions';
import { isFeatureEnabled, getNumericEntitlement } from '@/lib/entitlements/utils';

interface PermissionContextValue {
  permissions: string[];
  platformPermissions: string[];
  entitlements: EntitlementMap;
}

export const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  platformPermissions: [],
  entitlements: {},
});

export function usePermissions() {
  return useContext(PermissionContext);
}

export function useCan(permission: string): boolean {
  const { permissions } = useContext(PermissionContext);
  return permissions.includes(permission);
}

export function useCanPlatform(permission: string): boolean {
  const { platformPermissions } = useContext(PermissionContext);
  return platformPermissions.includes(permission);
}

export function useCanAny(...perms: string[]): boolean {
  const { permissions } = useContext(PermissionContext);
  return perms.some((p) => permissions.includes(p));
}

export function useEntitled(entitlementKey: string): boolean {
  const { entitlements } = useContext(PermissionContext);
  return isFeatureEnabled(entitlements, entitlementKey);
}

export function useEntitlementLimit(entitlementKey: string): number {
  const { entitlements } = useContext(PermissionContext);
  const val = entitlements[entitlementKey];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function useCanAndEntitled(permission: string, entitlementKey: string): boolean {
  return useCan(permission) && useEntitled(entitlementKey);
}
