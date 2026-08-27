import { getEntitlementValue } from './queries';
import { LimitCheckResult } from '@/types/subscriptions';
import { AuthorizationError } from '@/lib/auth/errors';

export async function hasEntitlement(accountId: string, key: string): Promise<boolean> {
  const val = await getEntitlementValue(accountId, key);
  return Boolean(val);
}

export async function getLimit(accountId: string, key: string): Promise<number> {
  const val = await getEntitlementValue(accountId, key);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export async function canCreateWithinLimit(
  accountId: string,
  key: string,
  currentUsage: number,
  delta: number = 1
): Promise<LimitCheckResult> {
  const limit = await getLimit(accountId, key);
  const projected = currentUsage + delta;
  const allowed = projected <= limit;
  const remaining = Math.max(0, limit - currentUsage);

  return {
    allowed,
    limit,
    currentUsage,
    remaining,
  };
}

export async function assertWithinLimit(
  accountId: string,
  key: string,
  currentUsage: number,
  delta: number = 1
): Promise<LimitCheckResult> {
  const result = await canCreateWithinLimit(accountId, key, currentUsage, delta);
  if (!result.allowed) {
    throw new AuthorizationError(
      'LIMIT_REACHED',
      `You've reached your plan limit (${result.currentUsage} of ${result.limit}).`,
      { key, limit: result.limit, current: result.currentUsage }
    );
  }
  return result;
}

export async function requireEntitlement(accountId: string, key: string): Promise<void> {
  const entitled = await hasEntitlement(accountId, key);
  if (!entitled) {
    throw new AuthorizationError(
      'FEATURE_NOT_INCLUDED',
      `Feature '${key}' is not available on your workspace plan.`,
      { entitlement: key }
    );
  }
}
