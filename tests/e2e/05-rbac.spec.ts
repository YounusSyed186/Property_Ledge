import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { TEST_DATA } from '../config/test-env';

test.describe('P0 — RBAC Permission & Authorization Matrix', () => {
  test('05.1: Owner has property view & access permissions', async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=456 Oak Avenue')).toBeVisible({ timeout: 20000 });
  });

  test('05.2: Leasing Agent can view assigned property', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 15000 });
  });

  test('05.3: Leasing Agent cannot access unauthorized Property B', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/units?propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=Main House')).toHaveCount(0);
  });
});
