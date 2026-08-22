import { createClient } from '@/lib/supabase/server';
import { Subscription, SubscriptionStatus } from '@/types/subscriptions';

export async function createSubscription(
  accountId: string,
  planId: string,
  status: SubscriptionStatus = 'active',
  providerData?: {
    provider?: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .insert({
      account_id: accountId,
      plan_id: planId,
      status,
      provider: providerData?.provider || 'stripe',
      provider_customer_id: providerData?.providerCustomerId || null,
      provider_subscription_id: providerData?.providerSubscriptionId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  return data;
}

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  return data;
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Subscription | null> {
  return updateSubscription(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: new Date().toISOString(),
    ...(cancelAtPeriodEnd ? {} : { status: 'canceled' }),
  });
}

export async function reactivateSubscription(subscriptionId: string): Promise<Subscription | null> {
  return updateSubscription(subscriptionId, {
    cancel_at_period_end: false,
    canceled_at: null,
    status: 'active',
  });
}
