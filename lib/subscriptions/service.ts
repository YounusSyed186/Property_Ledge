import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { Subscription, SubscriptionStatus } from '@/types/subscriptions';

async function assertCanManageSubscription(
  accountId: string,
  subscriptionId?: string,
  systemOp = false
) {
  if (systemOp) return;
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Authentication required.');
  }

  const supabase = await createAdminClient();
  const { data: adminRow } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (adminRow) return;

  if (accountId !== user.id) {
    throw new Error('FORBIDDEN: Cannot modify another account subscription.');
  }

  if (subscriptionId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('account_id')
      .eq('id', subscriptionId)
      .maybeSingle();
    if (!sub || (sub as { account_id: string }).account_id !== user.id) {
      throw new Error('FORBIDDEN: Subscription does not belong to the current user.');
    }
  }
}

export async function createSubscription(
  accountId: string,
  planId: string,
  status: SubscriptionStatus = 'active',
  providerData?: {
    provider?: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  },
  systemOp = false
): Promise<Subscription | null> {
  await assertCanManageSubscription(accountId, undefined, systemOp);
  const supabase = await createAdminClient();

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
  updates: Partial<Subscription>,
  systemOp = false
): Promise<Subscription | null> {
  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('account_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  const row = existing as { account_id: string } | null;
  if (!row) {
    throw new Error('Subscription not found.');
  }

  await assertCanManageSubscription(row.account_id, subscriptionId, systemOp);

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

export async function createTrialSubscription(
  accountId: string,
  planId: string,
  trialDays = 14
): Promise<Subscription | null> {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  await assertCanManageSubscription(accountId);
  const supabase = await createAdminClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .insert({
      account_id: accountId,
      plan_id: planId,
      status: 'trialing',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      provider: 'manual',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create trial subscription: ${error.message}`);
  }

  return data;
}
