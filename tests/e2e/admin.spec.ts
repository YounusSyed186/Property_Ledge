import { test, expect } from '@playwright/test';

test.describe('Phase 2 E2E - Admin Route Protection', () => {
  test('redirects unauthenticated user away from /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated user away from /admin/subscriptions', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated user away from /admin/plans', async ({ page }) => {
    await page.goto('/admin/plans');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated user away from /admin/entitlements', async ({ page }) => {
    await page.goto('/admin/entitlements');
    await expect(page).toHaveURL(/\/login/);
  });
});
