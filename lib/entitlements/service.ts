import { getEntitlements, getEntitlementValue } from './queries';
import { EntitlementMap } from '@/types/subscriptions';

export async function resolveAccountEntitlements(accountId: string): Promise<EntitlementMap> {
  return getEntitlements(accountId);
}

export async function checkFeatureEnabled(accountId: string, key: string): Promise<boolean> {
  const val = await getEntitlementValue(accountId, key);
  return Boolean(val);
}
