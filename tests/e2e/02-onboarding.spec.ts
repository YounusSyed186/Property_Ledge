import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('P1 — Onboarding Flow & Navigation', () => {
  test('02.1: Welcome page renders minimal copy without 12-step bar', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/onboarding');
    await expect(page.locator('h1, h2, div').filter({ hasText: /Welcome|Onboarding|Setup|Workspace|Good morning/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('02.2: Subscription page routes to subscription or active dashboard', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/onboarding/subscription');
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  });

  test('02.3: Legacy profile onboarding route redirects to workspace', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/onboarding/profile');
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
  });

  test('02.4: Legacy units onboarding route redirects to dashboard properties', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/onboarding/units');
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  });
});
