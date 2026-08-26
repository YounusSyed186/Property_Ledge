import { test, expect } from '@playwright/test';

/**
 * Product Journey E2E scenarios A–G — Onboarding redesign
 * Requires seed users and migration 0045 (profiles GRANT) applied.
 */

test.describe('Onboarding Journey A — Explore / free path', () => {
  test('A1: welcome page shows minimal copy without 12-step bar', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.locator('text=Welcome to PropertyLedge')).toBeVisible();
    await expect(page.locator('text=Get started')).toBeVisible();
    await expect(page.locator('text=PropertyLedge Setup')).toHaveCount(0);
    await expect(page.locator('[aria-label="Onboarding progress"] ol')).toHaveCount(0);
  });

  test.skip('A2: explore path skips payment screen', async ({ page }) => {
    // TODO: login as fresh user, complete workspace, choose explore, assert no /onboarding/payment
    await page.goto('/onboarding/subscription');
    await page.getByText('Explore first').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).not.toHaveURL(/\/onboarding\/payment/);
  });
});

test.describe('Onboarding Journey B — Trial path', () => {
  test.skip('B1: trial path skips payment', async ({ page }) => {
    await page.goto('/onboarding/subscription');
    await page.getByText('Free trial').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).not.toHaveURL(/\/onboarding\/payment/);
    await expect(page).toHaveURL(/\/onboarding\/property/);
  });
});

test.describe('Onboarding Journey C — Paid path', () => {
  test.skip('C1: paid plan shows payment screen', async ({ page }) => {
    await page.goto('/onboarding/subscription');
    await page.getByText('Choose a plan').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.goto('/onboarding/plans');
    await page.getByRole('button', { name: 'Select' }).first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/onboarding\/payment/);
  });
});

test.describe('Onboarding Journey D — Refresh persistence', () => {
  test.skip('D1: workspace form data survives refresh', async ({ page }) => {
    await page.goto('/onboarding/workspace');
    await page.fill('#workspaceName', 'Test Holdings');
    await page.reload();
    // After server persistence implementation, assert value restored from metadata
  });
});

test.describe('Onboarding Journey E — Back navigation', () => {
  test('E1: subscription page has back to workspace', async ({ page }) => {
    await page.goto('/onboarding/subscription');
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
  });
});

test.describe('Onboarding Journey F — Resume existing workspace', () => {
  test.skip('F1: user with workspace resumes at subscription', async ({ page }) => {
    // TODO: login as user with workspace but no subscription decision
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding\/subscription/);
  });
});

test.describe('Onboarding Journey G — Existing property', () => {
  test.skip('G1: user with property resumes at complete', async ({ page }) => {
    // TODO: login as user with workspace + property
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding\/complete/);
  });
});

test.describe('Onboarding — Legacy route redirects', () => {
  test('redirects profile to workspace', async ({ page }) => {
    await page.goto('/onboarding/profile');
    await expect(page).toHaveURL(/\/onboarding\/workspace/);
  });

  test('redirects units to dashboard', async ({ page }) => {
    await page.goto('/onboarding/units');
    await expect(page).toHaveURL(/\/dashboard\/units/);
  });
});

test.describe('Dashboard — Setup checklist', () => {
  test.skip('shows setup checklist for incomplete workspace', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Complete your workspace setup')).toBeVisible();
  });
});
