import { test, expect } from '@playwright/test';
import { getSubscription, getActiveSubscription } from '../../lib/subscriptions/queries';
import { getEntitlements, getEntitlementValue } from '../../lib/entitlements/queries';
import { resolveWorkspaceBilling } from '../../lib/entitlements/workspace-billing';
import { getWorkspaceSeatUsage } from '../../lib/entitlements/workspace-seats';

test.describe('Subscription & Entitlements Request Deduplication Suite', () => {
  test('getSubscription and getActiveSubscription are wrapped in React cache() functions', () => {
    expect(typeof getSubscription).toBe('function');
    expect(typeof getActiveSubscription).toBe('function');
  });

  test('getEntitlements and getEntitlementValue are wrapped in React cache() functions', () => {
    expect(typeof getEntitlements).toBe('function');
    expect(typeof getEntitlementValue).toBe('function');
  });

  test('resolveWorkspaceBilling and getWorkspaceSeatUsage are wrapped in React cache() functions', () => {
    expect(typeof resolveWorkspaceBilling).toBe('function');
    expect(typeof getWorkspaceSeatUsage).toBe('function');
  });
});
