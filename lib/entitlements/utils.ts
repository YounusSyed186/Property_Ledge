import type { EntitlementMap } from '@/types/subscriptions';

export function isFeatureEnabled(
  entitlements: EntitlementMap,
  key: string
): boolean {
  const val = entitlements[key];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

export function getNumericEntitlement(
  entitlements: EntitlementMap,
  key: string
): number {
  const val = entitlements[key];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}
