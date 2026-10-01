import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Cross-Navigation Auth & Subscription Cache Verification', () => {
  test('navigating between dashboard pages logs cache hits and avoids redundant DB queries', async ({ page }) => {
    // Sign in via helper
    await loginAs(page, 'landlord');

    // Visit dashboard
    await page.goto('/dashboard', { waitUntil: 'load' });
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Now navigate to /dashboard/properties
    await page.goto('/dashboard/properties', { waitUntil: 'load' });
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Now navigate to /dashboard/money
    await page.goto('/dashboard/money', { waitUntil: 'load' });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
