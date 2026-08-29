import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../config/test-env';
import { LoginPage } from '../pages/LoginPage';

test.describe('P0 — Authentication & Session Handling', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    loginPage = new LoginPage(page);
  });

  test('01.1: Unauthenticated user accessing protected /dashboard is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('redirectTo=%2Fdashboard');
  });

  test('01.2: Unauthenticated user accessing protected /admin is redirected to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('redirectTo=%2Fadmin');
  });

  test('01.3: Show error for invalid email or password', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('nonexistent@example.com', 'WrongPassword123!');
    await loginPage.assertErrorMessageVisible();
  });

  test('01.4: Valid Landlord login succeeds and lands on dashboard', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20000 });
  });

  test('01.5: Valid Admin login succeeds and routes to admin overview', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/(admin|dashboard)/, { timeout: 20000 });
  });

  test('01.6: Refreshing page preserves authenticated session', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20000 });

    await page.reload();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  });

  test('01.7: Direct signup page access renders signup form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1, h2').filter({ hasText: /Account|Sign up|Create|Welcome/i })).toBeVisible({ timeout: 15000 });
  });
});
