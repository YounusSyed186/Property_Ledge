import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('P0 — Navigation, Layout, Placeholder Hubs & Error States', () => {
  test('08.1: Landlord can navigate via Sidebar links', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2, div').filter({ hasText: /Dashboard/i }).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 15000 });

    await page.goto('/dashboard/team');
    await expect(page.locator('button:has-text("Add Member"), button:has-text("Add member")')).toBeVisible({ timeout: 15000 });
  });

  test('08.2a: Documents hub renders Soon indicator', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/documents');
    await expect(page.locator('text=Soon').first()).toBeVisible({ timeout: 10000 });
  });

  test('08.2b: Tasks hub renders Soon indicator', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/tasks');
    await expect(page.locator('text=Soon').first()).toBeVisible({ timeout: 10000 });
  });

  test('08.2c: Money hub renders Finances header', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/money');
    await expect(page.locator('h1, h2, div').filter({ hasText: /Finances|Money/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('08.2d: Reports hub renders Soon indicator', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/reports');
    await expect(page.locator('text=Soon').first()).toBeVisible({ timeout: 10000 });
  });

  test('08.3: Non-existent route returns 404 page', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/non-existent-route-999999');
    await expect(page.locator('h1, h2, p, div').filter({ hasText: /404|not found|page doesn't exist/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
