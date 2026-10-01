import { test, expect } from '@playwright/test';
import { ServerMemoryCache } from '@/lib/cache/server-cache';

test.describe('ServerMemoryCache — Multi-Tenant Isolation & Invalidation Suite', () => {
  test('correctly caches and returns stored value before TTL expires', async () => {
    const cache = new ServerMemoryCache();
    cache.set('user:usr_123:profile', { fullName: 'Alice' }, 1000);

    const val = cache.get<{ fullName: string }>('user:usr_123:profile');
    expect(val).toEqual({ fullName: 'Alice' });
  });

  test('expires entries past their TTL', async () => {
    const cache = new ServerMemoryCache();
    cache.set('user:usr_123:profile', { fullName: 'Alice' }, 10); // 10ms

    await new Promise((r) => setTimeout(r, 25));

    const val = cache.get('user:usr_123:profile');
    expect(val).toBeUndefined();
  });

  test('strictly enforces tenant isolation with identity-scoped keys', async () => {
    const cache = new ServerMemoryCache();
    cache.set('user:usr_alice:profile', { name: 'Alice', plan: 'pro' }, 60_000);
    cache.set('user:usr_bob:profile', { name: 'Bob', plan: 'free' }, 60_000);

    expect(cache.get('user:usr_alice:profile')).toEqual({ name: 'Alice', plan: 'pro' });
    expect(cache.get('user:usr_bob:profile')).toEqual({ name: 'Bob', plan: 'free' });
    expect(cache.get('user:usr_charlie:profile')).toBeUndefined();
  });

  test('targeted user invalidation evicts all keys for that user without affecting others', () => {
    const cache = new ServerMemoryCache();
    cache.set('user:usr_1:profile', { name: 'User 1' });
    cache.set('user:usr_1:account', { status: 'active' });
    cache.set('user:usr_1:workspaces', [{ id: 'ws_1' }]);

    cache.set('user:usr_2:profile', { name: 'User 2' });
    cache.set('user:usr_2:account', { status: 'active' });

    const evictedCount = cache.invalidateUser('usr_1');
    expect(evictedCount).toBe(3);

    expect(cache.get('user:usr_1:profile')).toBeUndefined();
    expect(cache.get('user:usr_1:account')).toBeUndefined();
    expect(cache.get('user:usr_1:workspaces')).toBeUndefined();

    // User 2 remains completely intact
    expect(cache.get('user:usr_2:profile')).toEqual({ name: 'User 2' });
    expect(cache.get('user:usr_2:account')).toEqual({ status: 'active' });
  });

  test('targeted account invalidation clears subscriptions and entitlements', () => {
    const cache = new ServerMemoryCache();
    cache.set('account:acc_100:subscription', { planId: 'pro' });
    cache.set('account:acc_100:entitlements', { 'properties.max': 50 });
    cache.set('account:acc_200:subscription', { planId: 'starter' });

    cache.invalidateAccount('acc_100');

    expect(cache.get('account:acc_100:subscription')).toBeUndefined();
    expect(cache.get('account:acc_100:entitlements')).toBeUndefined();

    // Account 200 is untouched
    expect(cache.get('account:acc_200:subscription')).toEqual({ planId: 'starter' });
  });

  test('targeted workspace invalidation clears workspace cache', () => {
    const cache = new ServerMemoryCache();
    cache.set('workspace:ws_abc:meta', { name: 'HQ' });
    cache.set('workspace:ws_abc:user:usr_1:permissions', ['property.view']);
    cache.set('workspace:ws_xyz:meta', { name: 'Branch' });

    cache.invalidateWorkspace('ws_abc');

    expect(cache.get('workspace:ws_abc:meta')).toBeUndefined();
    expect(cache.get('workspace:ws_abc:user:usr_1:permissions')).toBeUndefined();
    expect(cache.get('workspace:ws_xyz:meta')).toEqual({ name: 'Branch' });
  });

  test('evicts oldest 10% when maxEntries threshold is reached', () => {
    const cache = new ServerMemoryCache(10);
    for (let i = 0; i < 10; i++) {
      cache.set(`key_${i}`, i);
    }
    expect(cache.size()).toBe(10);

    // Adding 11th entry triggers eviction of 10% (1 entry)
    cache.set('key_10', 10);
    expect(cache.size()).toBe(10);
    expect(cache.get('key_0')).toBeUndefined(); // First inserted was evicted
    expect(cache.get('key_10')).toBe(10);
  });
});
