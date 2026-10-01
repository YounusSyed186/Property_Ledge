import { test, expect } from '@playwright/test';
import {
  useEntityCacheStore,
  FRESHNESS_THRESHOLDS,
  fetchWithDeduplication,
  buildCacheKey,
  isDataFresh,
  formatLastUpdated,
} from '../../lib/stores/useEntityCacheStore';

test.describe('PropertyLedge — Smart Data Caching & SWR Unit Suite', () => {
  test.beforeEach(() => {
    useEntityCacheStore.getState().invalidateAll();
  });

  test('1. Predictable Cache Key Generation', () => {
    const wsKey = buildCacheKey('workspace', 'ws_123');
    const propKey = buildCacheKey('properties', 'ws_123');
    const dashKey = buildCacheKey('dashboard', 'ws_123', 'all');
    const transKey = buildCacheKey('transactions', 'ws_123', 'prop_456', JSON.stringify({ status: 'paid' }));

    expect(wsKey).toBe('workspace:ws_123:all');
    expect(propKey).toBe('properties:ws_123:all');
    expect(dashKey).toBe('dashboard:ws_123:all');
    expect(transKey).toBe('transactions:ws_123:prop_456:{"status":"paid"}');
  });

  test('2. Cache Hydration & Freshness Check', () => {
    const store = useEntityCacheStore.getState();
    const key = buildCacheKey('dashboard', 'ws_1', 'all');
    const mockData = { totalUnits: 10, activeTenants: 8 };

    // Initial state: not cached
    expect(isDataFresh(store.cacheMap[key], FRESHNESS_THRESHOLDS.live)).toBe(false);
    expect(store.cacheMap[key]).toBeUndefined();

    // Hydrate cache
    store.setKeyedData(key, mockData, 'ws_1', null);

    // Fresh immediately after hydration (< 5000ms)
    const cached = useEntityCacheStore.getState().cacheMap[key];
    expect(isDataFresh(cached, FRESHNESS_THRESHOLDS.live)).toBe(true);
    expect(cached).toBeDefined();
    expect(cached?.data).toEqual(mockData);
    expect(cached?.isRefreshing).toBe(false);
  });

  test('3. Stale Detection after Freshness Window', () => {
    const store = useEntityCacheStore.getState();
    const key = buildCacheKey('dashboard', 'ws_1', 'prop_1');
    const mockData = { revenue: 5000 };

    // Set data in store
    store.setKeyedData(key, mockData, 'ws_1', 'prop_1');

    // Simulate entry 6 seconds in the past
    const entry = useEntityCacheStore.getState().cacheMap[key];
    const staleEntry = { ...entry, fetchedAt: Date.now() - 6000, timestamp: Date.now() - 6000 };

    // Should be stale for live threshold (5000ms)
    expect(isDataFresh(staleEntry, FRESHNESS_THRESHOLDS.live)).toBe(false);

    // Should still be fresh for normal threshold (30000ms)
    expect(isDataFresh(staleEntry, FRESHNESS_THRESHOLDS.normal)).toBe(true);

    // Existing data is still readable (SWR principle: never blank the UI)
    expect(staleEntry.data).toEqual(mockData);
  });

  test('4. In-Flight Request Deduplication', async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { result: 'success' };
    };

    // 5 concurrent requests with identical key
    const [res1, res2, res3, res4, res5] = await Promise.all([
      fetchWithDeduplication('test-dedup-key', fetcher),
      fetchWithDeduplication('test-dedup-key', fetcher),
      fetchWithDeduplication('test-dedup-key', fetcher),
      fetchWithDeduplication('test-dedup-key', fetcher),
      fetchWithDeduplication('test-dedup-key', fetcher),
    ]);

    // All return identical result
    expect(res1).toEqual({ result: 'success' });
    expect(res2).toEqual({ result: 'success' });
    expect(res3).toEqual({ result: 'success' });
    expect(res4).toEqual({ result: 'success' });
    expect(res5).toEqual({ result: 'success' });

    // Fetcher was invoked EXACTLY ONCE
    expect(callCount).toBe(1);
  });

  test('5. Non-Blanking Background Refresh State', () => {
    const store = useEntityCacheStore.getState();
    const key = buildCacheKey('dashboard', 'ws_1', 'all');
    store.setKeyedData(key, { count: 5 }, 'ws_1', null);

    // Mark as refreshing in background
    store.setKeyedRefreshing(key, true);

    const cached = useEntityCacheStore.getState().cacheMap[key];
    // Data remains immediately accessible while refreshing
    expect(cached?.data).toEqual({ count: 5 });
    expect(cached?.isRefreshing).toBe(true);

    // Refresh completes
    store.setKeyedData(key, { count: 6 }, 'ws_1', null);
    const refreshed = useEntityCacheStore.getState().cacheMap[key];
    expect(refreshed?.data).toEqual({ count: 6 });
    expect(refreshed?.isRefreshing).toBe(false);
  });

  test('6. Targeted Invalidation Does Not Wipe Unrelated Cache', () => {
    const store = useEntityCacheStore.getState();
    const propKey = buildCacheKey('properties', 'ws_1');
    const leaseKey = buildCacheKey('leases', 'ws_1');
    const dashKey = buildCacheKey('dashboard', 'ws_1', 'all');

    store.setKeyedData(propKey, [{ id: 'p1' }], 'ws_1', null);
    store.setKeyedData(leaseKey, [{ id: 'l1' }], 'ws_1', null);
    store.setKeyedData(dashKey, { summary: 'active' }, 'ws_1', null);

    // Invalidate only leases prefix
    store.invalidateKeyPrefix('leases:');

    const state = useEntityCacheStore.getState();
    // Leases invalidated
    expect(state.cacheMap[leaseKey]).toBeUndefined();

    // Properties and dashboard remain safely cached
    expect(state.cacheMap[propKey]).toBeDefined();
    expect(state.cacheMap[dashKey]).toBeDefined();
  });

  test('7. Last Updated Formatter', () => {
    // Less than 3 seconds ago
    expect(formatLastUpdated(Date.now() - 1000)).toBe('just now');

    // 25 seconds ago
    expect(formatLastUpdated(Date.now() - 25000)).toBe('25s ago');

    // 2 minutes ago
    expect(formatLastUpdated(Date.now() - 120000)).toBe('2m ago');
  });
});
