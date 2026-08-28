import { test, expect } from '@playwright/test';

test.describe('Team RBAC', () => {
  test('join page shows invalid state for bad token', async ({ page }) => {
    await page.goto('/join/invalid-token-xyz');
    await expect(page.getByText(/invalid invitation/i)).toBeVisible({ timeout: 10000 });
  });

  test('team page redirects to settings team', async ({ page }) => {
    await page.goto('/dashboard/team');
    await expect(page).toHaveURL(/login|settings\/team/);
  });

  test('settings team roles page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/team/roles');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Invite redirect', () => {
  test('legacy invite route redirects to join', async ({ page }) => {
    await page.goto('/invite/ws_test-token');
    await expect(page).toHaveURL(/\/join\/ws_test-token/);
  });
});
