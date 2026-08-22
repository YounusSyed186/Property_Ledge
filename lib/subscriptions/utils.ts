import { SubscriptionStatus } from '@/types/subscriptions';

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}
