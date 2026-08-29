import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('P0 — Admin Panel Capabilities & Authorization', () => {
  test('03.1: Super Admin can access Admin Panel overview', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await expect(page.locator('text=Total Accounts')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Active Subscriptions')).toBeVisible({ timeout: 10000 });
  });

  test('03.2: Admin can navigate to Users page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.locator('h1, h2, div').filter({ hasText: /^Users$/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('03.3: Admin can navigate to Subscriptions page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/subscriptions');
    await expect(page.locator('h1, h2, div').filter({ hasText: /^Subscriptions$/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('03.4: Admin can navigate to Activity Logs page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/activity');
    await expect(page.locator('h1, h2, div').filter({ hasText: /Activity/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('03.5: Non-admin Landlord is blocked from accessing Admin Panel', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/(dashboard|login|403)/, { timeout: 10000 });
  });

  test('03.6: Non-admin Agent is blocked from accessing Admin Users page', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/(dashboard|login|403)/, { timeout: 10000 });
  });

  test('03.7: Refreshing Admin Panel maintains admin authorization', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await expect(page.locator('text=Total Accounts')).toBeVisible({ timeout: 15000 });
    await page.reload();
    await expect(page.locator('text=Total Accounts')).toBeVisible({ timeout: 15000 });
  });
});
