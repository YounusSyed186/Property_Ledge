import { createClient } from '@/lib/supabase/server';
import { Subscription, ActiveSubscriptionWithPlan, SubscriptionPlan } from '@/types/subscriptions';
import { isSubscriptionActive } from './utils';
import { logAuthEvent } from '@/lib/debug/logger';

export async function getSubscription(accountId: string): Promise<ActiveSubscriptionWithPlan | null> {
  logAuthEvent('SUBSCRIPTION_LOAD_STARTED', { accountId });
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
      logAuthEvent('SUBSCRIPTION_LOAD_FAILED', { accountId, error: error.message });
      return null;
    }

    logAuthEvent('SUBSCRIPTION_LOAD_SUCCESS', { accountId });
    return data;
  } catch (err) {
    logAuthEvent('SUBSCRIPTION_LOAD_FAILED', { accountId, err });
    return null;
  }
}

export async function getActiveSubscription(accountId: string): Promise<ActiveSubscriptionWithPlan | null> {
  const sub = await getSubscription(accountId);
  if (!sub) return null;

  if (isSubscriptionActive(sub.status)) {
    return sub;
  }

  return null;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
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
}
