import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Subscription, ActiveSubscriptionWithPlan, SubscriptionPlan } from '@/types/subscriptions';
import { isSubscriptionActive } from './utils';
import { logAuthEvent } from '@/lib/debug/logger';
import { serverCache } from '@/lib/cache/server-cache';

export const getSubscription = cache(async function getSubscription(
  accountId: string
): Promise<ActiveSubscriptionWithPlan | null> {
  const maskedId = accountId ? `${accountId.slice(0, 8)}...` : 'unknown';
  const cacheKey = `account:${accountId}:subscription`;
  const cached = serverCache.get<ActiveSubscriptionWithPlan | null>(cacheKey);
  if (cached !== undefined) {
    logAuthEvent('SUBSCRIPTION_LOAD_SUCCESS', {
      accountId: maskedId,
      planId: cached?.plan_id,
      cacheHit: true,
      duration: '0ms',
    });
    return cached;
  }

  const startTime = Date.now();
  logAuthEvent('SUBSCRIPTION_LOAD_STARTED', { accountId: maskedId, cacheHit: false });
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logAuthEvent('SUBSCRIPTION_LOAD_FAILED', { accountId: maskedId, error: error.message });
      return null;
    }

    serverCache.set(cacheKey, data ?? null, 120_000); // 120s TTL

    logAuthEvent('SUBSCRIPTION_LOAD_SUCCESS', {
      accountId: maskedId,
      planId: data?.plan_id,
      cacheHit: false,
      duration: `${Date.now() - startTime}ms`,
    });
    return data;
  } catch (err) {
    logAuthEvent('SUBSCRIPTION_LOAD_FAILED', { accountId: maskedId, err });
    return null;
  }
});

export const getActiveSubscription = cache(async function getActiveSubscription(
  accountId: string
): Promise<ActiveSubscriptionWithPlan | null> {
  const sub = await getSubscription(accountId);
  if (!sub) return null;

  if (isSubscriptionActive(sub.status)) {
    return sub;
  }

  return null;
});

export const getSubscriptionPlans = cache(async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const cacheKey = 'plans:active';
  const cached = serverCache.get<SubscriptionPlan[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('subscription_plans')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (error || !data) return [];
    serverCache.set(cacheKey, data, 300_000); // 300s TTL
    return data;
  } catch (err) {
    return [];
  }
});

