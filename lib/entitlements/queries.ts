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

import { serverCache } from '@/lib/cache/server-cache';

export const getEntitlements = cache(async function getEntitlements(accountId: string): Promise<EntitlementMap> {
  const maskedId = accountId ? `${accountId.slice(0, 8)}...` : 'unknown';
  const cacheKey = `account:${accountId}:entitlements`;
  const cached = serverCache.get<EntitlementMap>(cacheKey);
  if (cached !== undefined) {
    logAuthEvent('ENTITLEMENTS_LOAD_SUCCESS', {
      accountId: maskedId,
      count: Object.keys(cached).length,
      cacheHit: true,
      duration: '0ms',
    });
    return cached;
  }

  const startTime = Date.now();
  logAuthEvent('ENTITLEMENTS_LOAD_STARTED', { accountId: maskedId, cacheHit: false });
  try {
    const sub = await getSubscription(accountId);
    if (!sub || !isSubscriptionActive(sub.status)) {
      serverCache.set(cacheKey, {}, 120_000);
      logAuthEvent('ENTITLEMENTS_LOAD_SUCCESS', {
        accountId: maskedId,
        count: 0,
        reason: 'inactive_or_missing_sub',
        cacheHit: false,
        duration: `${Date.now() - startTime}ms`,
      });
      return {};
    }

    const planCacheKey = `plan:${sub.plan_id}:entitlements`;
    let map = serverCache.get<EntitlementMap>(planCacheKey);

    if (!map) {
      const supabase = await createClient();
      const { data: planEntitlements, error } = await (supabase as any)
        .from('plan_entitlements')
        .select('value, entitlements(key, value_type)')
        .eq('plan_id', sub.plan_id);

      if (error || !planEntitlements) {
        logAuthEvent('ENTITLEMENTS_LOAD_FAILED', { accountId: maskedId, error: error?.message });
        return {};
      }

      map = {};
      for (const item of planEntitlements) {
        const ent = item.entitlements;
        if (ent && ent.key) {
          map[ent.key] = sanitizeEntitlementValue(item.value, ent.value_type);
        }
      }
      serverCache.set(planCacheKey, map, 300_000); // 300s TTL for static plan definitions
    }

    serverCache.set(cacheKey, map, 120_000); // 120s TTL for account-specific entitlements

    logAuthEvent('ENTITLEMENTS_LOAD_SUCCESS', {
      accountId: maskedId,
      count: Object.keys(map).length,
      cacheHit: false,
      duration: `${Date.now() - startTime}ms`,
    });
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
