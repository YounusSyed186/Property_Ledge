import { getActiveSubscription } from './queries';
import { ActiveSubscriptionWithPlan } from '@/types/subscriptions';

export async function requireActiveSubscription(accountId: string): Promise<ActiveSubscriptionWithPlan> {
  const activeSub = await getActiveSubscription(accountId);
  if (!activeSub) {
    throw new Error('SUBSCRIPTION_INACTIVE: An active subscription is required for this operation.');
  }
  return activeSub;
}
