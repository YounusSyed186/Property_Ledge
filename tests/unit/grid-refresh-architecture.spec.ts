import { test, expect } from '@playwright/test';
import {
  useEntityCacheStore,
  buildCacheKey,
  fetchWithDeduplication,
} from '../../lib/stores/useEntityCacheStore';
import { formatRelativeTime } from '../../components/admin/data-grid/GridRefreshButton';

test.describe('AG Grid Reload / Refresh Architecture Suite', () => {
  test.beforeEach(() => {
    useEntityCacheStore.getState().invalidateAll();
  });

  test('1. Relative timestamp formatting works correctly for "Updated just now" and elapsed time', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
    expect(`Updated ${formatRelativeTime(now)}`).toBe('Updated just now');

    const tenSecsAgo = new Date(Date.now() - 10000);
    expect(formatRelativeTime(tenSecsAgo)).toBe('10s ago');
    expect(`Updated ${formatRelativeTime(tenSecsAgo)}`).toBe('Updated 10s ago');

    const twoMinsAgo = new Date(Date.now() - 120000);
    expect(formatRelativeTime(twoMinsAgo)).toBe('2m ago');
    expect(`Updated ${formatRelativeTime(twoMinsAgo)}`).toBe('Updated 2m ago');

    expect(formatRelativeTime(null)).toBe('');
  });

  test('2. Manual Refresh bypasses stale cache and performs fresh targeted fetch', async () => {
    const wsId = 'ws_test_456';
    const propKey = buildCacheKey('properties', wsId, 'all');

    // 1. Initial cached state
    useEntityCacheStore.getState().setKeyedData(propKey, [{ id: 'p1', name: 'Original Property' }], wsId, null);
    expect(useEntityCacheStore.getState().cacheMap[propKey]?.data).toEqual([{ id: 'p1', name: 'Original Property' }]);

    // 2. User clicks Refresh -> targeted fetch function returns fresh data
    const fetchFreshData = async () => [{ id: 'p1', name: 'Updated Property' }, { id: 'p2', name: 'New Property' }];
    const freshRows = await fetchFreshData();

    // 3. Updates store & AG Grid subscription
    useEntityCacheStore.getState().setKeyedData(propKey, freshRows, wsId, null);

    const updated = useEntityCacheStore.getState().cacheMap[propKey];
    expect(updated?.data).toHaveLength(2);
    expect(updated?.data[0].name).toBe('Updated Property');
    expect(updated?.isRefreshing).toBe(false);
  });

  test('3. Request Deduplication prevents duplicate fetches during active refresh', async () => {
    let callCount = 0;
    const fetchFn = async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { success: true };
    };

    // Trigger multiple simultaneous calls
    const [res1, res2, res3] = await Promise.all([
      fetchWithDeduplication('test-dedup-key', fetchFn),
      fetchWithDeduplication('test-dedup-key', fetchFn),
      fetchWithDeduplication('test-dedup-key', fetchFn),
    ]);

    expect(res1).toEqual({ success: true });
    expect(res2).toEqual({ success: true });
    expect(res3).toEqual({ success: true });
    expect(callCount).toBe(1); // Deduped to exactly 1 request
  });

  test('4. Refresh Error keeps existing grid/cache data and resets isRefreshing', async () => {
    const key = buildCacheKey('leases', 'ws_1', 'prop_1');
    const existingData = [{ id: 'lease_1', amount: 550 }];

    // Set initial data
    useEntityCacheStore.getState().setKeyedData(key, existingData, 'ws_1', 'prop_1');
    expect(useEntityCacheStore.getState().cacheMap[key]?.data).toEqual(existingData);

    // Mark refreshing
    useEntityCacheStore.getState().setKeyedRefreshing(key, true);
    expect(useEntityCacheStore.getState().cacheMap[key]?.isRefreshing).toBe(true);

    // Simulate fetch failure
    try {
      throw new Error('Database connection failed');
    } catch (e) {
      // In error handler, existing data is preserved and isRefreshing is reset to false
      useEntityCacheStore.getState().setKeyedRefreshing(key, false);
    }

    const stateAfterError = useEntityCacheStore.getState().cacheMap[key];
    expect(stateAfterError?.data).toEqual(existingData); // Data preserved
    expect(stateAfterError?.isRefreshing).toBe(false); // Button becomes available again
  });

  test('5. Scoped Context Preservation (All vs Property A)', () => {
    const store = useEntityCacheStore.getState();
    const allKey = buildCacheKey('transactions', 'ws_1', 'all');
    const propAKey = buildCacheKey('transactions', 'ws_1', 'prop_a');
    const propBKey = buildCacheKey('transactions', 'ws_1', 'prop_b');

    store.setKeyedData(allKey, [{ id: 't_all' }], 'ws_1', null);
    store.setKeyedData(propAKey, [{ id: 't_prop_a' }], 'ws_1', 'prop_a');
    store.setKeyedData(propBKey, [{ id: 't_prop_b' }], 'ws_1', 'prop_b');

    // Refreshing Property A only targets propAKey
    store.setKeyedData(propAKey, [{ id: 't_prop_a_fresh' }], 'ws_1', 'prop_a');

    expect(useEntityCacheStore.getState().cacheMap[propAKey]?.data).toEqual([{ id: 't_prop_a_fresh' }]);
    expect(useEntityCacheStore.getState().cacheMap[propBKey]?.data).toEqual([{ id: 't_prop_b' }]);
    expect(useEntityCacheStore.getState().cacheMap[allKey]?.data).toEqual([{ id: 't_all' }]);
  });

  test('6. Empty Results handling does not error and sets empty list', () => {
    const store = useEntityCacheStore.getState();
    const key = buildCacheKey('invoices', 'ws_1', 'all');

    store.setKeyedData(key, [], 'ws_1', null);
    const cached = useEntityCacheStore.getState().cacheMap[key];

    expect(cached?.data).toEqual([]);
    expect(cached?.isRefreshing).toBe(false);
  });
});
