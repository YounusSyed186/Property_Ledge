import { test, expect } from '@playwright/test';

test.describe('Phase 2 E2E - V2 Subscription Checkout Flow', () => {
  test('redirects unauthenticated user away from /checkout to /login', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
  });
});
