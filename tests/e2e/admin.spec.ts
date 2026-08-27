import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('admin should access dashboard', async ({ page }) => {
    await expect(page.locator('text=Platform Overview')).toBeVisible();
    await expect(page.locator('text=Total Accounts')).toBeVisible();
    await expect(page.locator('text=Active Subscriptions')).toBeVisible();
  });

  test('admin should access users page', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('text=Users')).toBeVisible();
  });

  test('admin should access subscriptions page', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await expect(page.locator('text=Subscriptions')).toBeVisible();
  });

  test('admin should access activity logs page', async ({ page }) => {
    await page.goto('/admin/activity');
    await expect(page.locator('text=Activity Logs')).toBeVisible();
  });

  test('normal user should NOT access admin dashboard', async ({ page }) => {
    // Login as normal user (landlord)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'landlord@test.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Try to access admin
    await page.goto('/admin');
    
    // Should be redirected or denied
    await expect(page).toHaveURL(/\/dashboard|\/login|\/403/);
  });

  test('normal user should NOT access admin users page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'landlord@test.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/dashboard|\/login|\/403/);
  });
});