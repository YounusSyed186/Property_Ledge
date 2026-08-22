import { test, expect } from '@playwright/test';

test.describe('Phase 2 E2E - Pricing Page', () => {
  test('pricing page loads successfully', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('Flexible Plans for Property Management');
  });
});
