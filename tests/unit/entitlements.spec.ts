import { test, expect } from '@playwright/test';
import { sanitizeEntitlementValue } from '../../lib/entitlements/queries';
import { isSubscriptionActive } from '../../lib/subscriptions/utils';

test.describe('Phase 2 Unit Tests - Entitlement Value Validation', () => {
  test('sanitizes boolean entitlement values correctly', () => {
    expect(sanitizeEntitlementValue(true, 'boolean')).toBe(true);
    expect(sanitizeEntitlementValue(false, 'boolean')).toBe(false);
    expect(sanitizeEntitlementValue('true', 'boolean')).toBe(true);
    expect(sanitizeEntitlementValue('false', 'boolean')).toBe(false);
    expect(sanitizeEntitlementValue(1, 'boolean')).toBe(true);
    expect(sanitizeEntitlementValue(0, 'boolean')).toBe(false);
    expect(sanitizeEntitlementValue(null, 'boolean')).toBe(false);
  });

  test('sanitizes number entitlement values correctly', () => {
    expect(sanitizeEntitlementValue(10, 'number')).toBe(10);
    expect(sanitizeEntitlementValue('25', 'number')).toBe(25);
    expect(sanitizeEntitlementValue('invalid', 'number')).toBe(0);
    expect(sanitizeEntitlementValue(null, 'number')).toBe(0);
  });

  test('sanitizes string entitlement values correctly', () => {
    expect(sanitizeEntitlementValue('standard', 'string')).toBe('standard');
    expect(sanitizeEntitlementValue(100, 'string')).toBe('100');
    expect(sanitizeEntitlementValue(null, 'string')).toBe('');
  });
});

test.describe('Phase 2 Unit Tests - Subscription Active Evaluator', () => {
  test('identifies active and trialing statuses as active', () => {
    expect(isSubscriptionActive('active')).toBe(true);
    expect(isSubscriptionActive('trialing')).toBe(true);
  });

  test('identifies past_due, canceled, expired as inactive', () => {
    expect(isSubscriptionActive('past_due')).toBe(false);
    expect(isSubscriptionActive('canceled')).toBe(false);
    expect(isSubscriptionActive('expired')).toBe(false);
    expect(isSubscriptionActive('paused')).toBe(false);
  });
});
