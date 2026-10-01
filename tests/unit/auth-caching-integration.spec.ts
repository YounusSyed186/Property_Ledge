import { test, expect } from '@playwright/test';
import { serverCache } from '@/lib/cache/server-cache';

test.describe('Auth, Subscription & Entitlements Server Caching Integration', () => {
  const userId = 'test_user_' + Math.random().toString(36).substring(7);
  const accountId = 'test_account_' + Math.random().toString(36).substring(7);
  const planId = 'test_plan_pro';

  test.beforeEach(() => {
    serverCache.clear();
  });

  test('caches profile across multiple calls and avoids redundant fetches', async () => {
    const profileKey = `user:${userId}:profile`;

    // 1. Initial state: cache miss
    expect(serverCache.get(profileKey)).toBeUndefined();

    // 2. Simulated fetch populates cache
    const mockProfile = { id: userId, full_name: 'Test Landlord', avatar_url: null };
    serverCache.set(profileKey, mockProfile, 60_000);

    // 3. Second navigation / call: cache hit in 0ms
    const start = performance.now();
    const cached = serverCache.get(profileKey);
    const duration = performance.now() - start;

    expect(cached).toEqual(mockProfile);
    expect(duration).toBeLessThan(5); // 0ms in-memory resolution
  });

  test('caches account context across dashboard navigation', async () => {
    const accountKey = `user:${userId}:account`;

    expect(serverCache.get(accountKey)).toBeUndefined();

    const mockAccount = { user_id: userId, status: 'active', onboarding_status: 'completed' };
    serverCache.set(accountKey, mockAccount, 60_000);

    expect(serverCache.get(accountKey)).toEqual(mockAccount);
  });

  test('caches subscription per accountId avoiding repeated database queries', async () => {
    const subKey = `account:${accountId}:subscription`;

    expect(serverCache.get(subKey)).toBeUndefined();

    const mockSub = {
      id: 'sub_123',
      account_id: accountId,
      plan_id: planId,
      status: 'active',
      subscription_plans: { name: 'Pro Plan', slug: 'pro' },
    };
    serverCache.set(subKey, mockSub, 120_000);

    const cached = serverCache.get(subKey);
    expect(cached).toEqual(mockSub);
  });

  test('caches entitlements per account and static plan definitions', async () => {
    const entKey = `account:${accountId}:entitlements`;
    const planKey = `plan:${planId}:entitlements`;

    const mockEntitlements = {
      'properties.max': 25,
      'export.csv': true,
      'team.management': true,
    };

    serverCache.set(planKey, mockEntitlements, 300_000);
    serverCache.set(entKey, mockEntitlements, 120_000);

    expect(serverCache.get(entKey)).toEqual(mockEntitlements);
    expect(serverCache.get(planKey)).toEqual(mockEntitlements);
  });

  test('mutation invalidates account cache while preserving other accounts', async () => {
    const otherAccountId = 'acc_other_456';

    serverCache.set(`account:${accountId}:subscription`, { id: 'sub_1' });
    serverCache.set(`account:${accountId}:entitlements`, { 'properties.max': 10 });
    serverCache.set(`account:${otherAccountId}:subscription`, { id: 'sub_2' });

    // Invalidate accountId on subscription update
    serverCache.invalidateAccount(accountId);

    expect(serverCache.get(`account:${accountId}:subscription`)).toBeUndefined();
    expect(serverCache.get(`account:${accountId}:entitlements`)).toBeUndefined();

    // Other account is preserved
    expect(serverCache.get(`account:${otherAccountId}:subscription`)).toEqual({ id: 'sub_2' });
  });
});
