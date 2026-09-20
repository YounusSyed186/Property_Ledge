import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscriptions/queries';
import { isSubscriptionActive } from '@/lib/subscriptions/utils';
import { EntitlementMap, EntitlementValue } from '@/types/subscriptions';
import { logAuthEvent } from '@/lib/debug/logger';

export function sanitizeEntitlementValue(rawVal: unknown, valueType: 'boolean' | 'number' | 'string'): EntitlementValue {
  if (rawVal === null || rawVal === undefined) {
    if (valueType === 'boolean') return false;
    if (valueType === 'number') return 0;
    return '';
  }

  if (valueType === 'boolean') {
    if (typeof rawVal === 'boolean') return rawVal;
    if (typeof rawVal === 'string') return rawVal.toLowerCase() === 'true';
    if (typeof rawVal === 'number') return rawVal > 0;
    return false;
  }

  if (valueType === 'number') {
    if (typeof rawVal === 'number') return rawVal;
    if (typeof rawVal === 'string') {
      const parsed = Number(rawVal);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  return String(rawVal);
}

export const getEntitlements = cache(async function getEntitlements(accountId: string): Promise<EntitlementMap> {
  const maskedId = accountId ? `${accountId.slice(0, 8)}...` : 'unknown';
  logAuthEvent('ENTITLEMENTS_LOAD_STARTED', { accountId: maskedId });
  try {
    const sub = await getSubscription(accountId);
    if (!sub || !isSubscriptionActive(sub.status)) {
      logAuthEvent('ENTITLEMENTS_LOAD_SUCCESS', { accountId: maskedId, count: 0, reason: 'inactive_or_missing_sub' });
      return {};
    }

    const supabase = await createClient();
    const { data: planEntitlements, error } = await (supabase as any)
      .from('plan_entitlements')
      .select('value, entitlements(key, value_type)')
      .eq('plan_id', sub.plan_id);

    if (error || !planEntitlements) {
      logAuthEvent('ENTITLEMENTS_LOAD_FAILED', { accountId: maskedId, error: error?.message });
      return {};
    }

    const map: EntitlementMap = {};

    for (const item of planEntitlements) {
      const ent = item.entitlements;
      if (ent && ent.key) {
        map[ent.key] = sanitizeEntitlementValue(item.value, ent.value_type);
      }
    }

    logAuthEvent('ENTITLEMENTS_LOAD_SUCCESS', { accountId: maskedId, count: Object.keys(map).length });
    return map;
  } catch (err) {
    logAuthEvent('ENTITLEMENTS_LOAD_FAILED', { accountId: maskedId, err });
    return {};
  }
});

export const getEntitlementValue = cache(async function getEntitlementValue(
  accountId: string,
  key: string
): Promise<EntitlementValue | null> {
  const map = await getEntitlements(accountId);
  return map[key] ?? null;
});
