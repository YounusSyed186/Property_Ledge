import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Subscription, ActiveSubscriptionWithPlan, SubscriptionPlan } from '@/types/subscriptions';
import { isSubscriptionActive } from './utils';
import { logAuthEvent } from '@/lib/debug/logger';

export const getSubscription = cache(async function getSubscription(
  accountId: string
): Promise<ActiveSubscriptionWithPlan | null> {
  const maskedId = accountId ? `${accountId.slice(0, 8)}...` : 'unknown';
  logAuthEvent('SUBSCRIPTION_LOAD_STARTED', { accountId: maskedId });
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

    logAuthEvent('SUBSCRIPTION_LOAD_SUCCESS', { accountId: maskedId, planId: data?.plan_id });
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
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('subscription_plans')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (err) {
    return [];
  }
});
