import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { TEST_DATA } from '../config/test-env';

test.describe('P0 — Security & Multi-Tenant IDOR Protection', () => {
  test('07.1: Agent CAN view authorized Property A (123 Main Street)', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 15000 });
  });

  test('07.2: Agent CANNOT view unauthorized Property B units via URL manipulation', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/units?propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=456 Oak Avenue')).toHaveCount(0);
  });

  test('07.3: Agent CANNOT view Property B tenants via URL', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/people?propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=Michael Brown')).toHaveCount(0);
  });

  test('07.4: Agent accessing placeholder leases hub sees Coming Soon', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/leases?propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=Coming Soon').first()).toBeVisible({ timeout: 10000 });
  });

  test('07.5: Agent CANNOT view Property B invoices via URL', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/money?tab=invoices&propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=INV-2024-004')).toHaveCount(0);
  });

  test('07.6: Agent CANNOT view Property B payments via URL', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/money?tab=payments&propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=PAY-002')).toHaveCount(0);
  });

  test('07.7: Landlord owner CAN view both Property A and Property B', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=456 Oak Avenue')).toBeVisible({ timeout: 15000 });
  });
});
