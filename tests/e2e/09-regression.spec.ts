import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { TEST_USERS, TEST_DATA } from '../config/test-env';
import { LoginPage } from '../pages/LoginPage';

test.describe('P0 — Full Application E2E Regression Suite', () => {
  test('REG-01: Authentication — Invalid credentials show error toast/alert', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid-user@test.com', 'WrongPassword123!');
    await loginPage.assertErrorMessageVisible();
  });

  test('REG-02: Authentication — Valid Landlord login lands on dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20000 });
  });

  test('REG-03: Admin Panel — Platform Admin accesses Admin Overview', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await expect(page.locator('text=Total Accounts')).toBeVisible({ timeout: 15000 });
  });

  test('REG-04: Teams — Landlord owner opens Add Member modal', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/team');
    await page.click('button:has-text("Add Member"), button:has-text("Add member")');
    await expect(page.locator('text=Add team member').first()).toBeVisible({ timeout: 10000 });
  });

  test('REG-05: Properties — Landlord views primary properties table', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 15000 });
  });

  test('REG-06: Security & IDOR — Agent blocked from unauthorized Property B units', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto(`/dashboard/units?propertyId=${TEST_DATA.propertyB.id}`);
    await expect(page.locator('text=456 Oak Avenue')).toHaveCount(0);
  });

  test('REG-07: Onboarding — Direct access to onboarding page renders onboarding form', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/onboarding/workspace');
    await expect(page.locator('h1, h2, form').first()).toBeVisible({ timeout: 15000 });
  });
});
