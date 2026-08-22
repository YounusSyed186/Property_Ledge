import { test, expect } from '@playwright/test';

test.describe('Phase 2 E2E - Admin Route Protection', () => {
  test('redirects unauthenticated user away from /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
