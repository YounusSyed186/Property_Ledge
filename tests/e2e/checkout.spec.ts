import { test, expect } from '@playwright/test';

test.describe('Phase 2 E2E - V2 Subscription Checkout Flow', () => {
  test('checkout page renders step 1 plan selection', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('h1')).toContainText('Review Your Selected Plan');
  });

  test('checkout page completes step 1 and advances to step 2 details', async ({ page }) => {
    await page.goto('/checkout');
    await page.click('button:has-text("Continue to Details")');
    await expect(page.locator('h2')).toContainText('Enter Billing Information');
  });
});
