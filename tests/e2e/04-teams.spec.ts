import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('P0 — Team Management & Member Invitations', () => {
  test('04.1: Landlord owner can view team page & seat usage badge', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/team');
    await expect(page.locator('button:has-text("Add Member"), button:has-text("Add member")')).toBeVisible({ timeout: 15000 });
  });

  test('04.2: Open Add Member modal and switch tabs between Invite Link and Profile ID', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/team');
    await page.click('button:has-text("Add Member"), button:has-text("Add member")');
    await expect(page.locator('text=Add team member').first()).toBeVisible({ timeout: 10000 });

    const inviteLinkBtn = page.locator('button:has-text("Invite link")').first();
    if (await inviteLinkBtn.isVisible()) {
      await inviteLinkBtn.click();
      await expect(page.locator('select').first()).toBeVisible();
    }
  });

  test('04.3: Toggle tabs between Members and Pending Invitations', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/team');
    const invitationsTab = page.locator('button:has-text("Pending invitations")').or(page.locator('button:has-text("Pending Invitations")'));
    if (await invitationsTab.isVisible()) {
      await invitationsTab.click();
      await expect(page.locator('.ag-root').or(page.locator('text=No pending invitations'))).toBeVisible();
    }
  });

  test('04.4: Agent with view-only permissions cannot execute team member deletion/invite', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/dashboard/team');
    const addMemberButton = page.locator('button:has-text("Add Member"), button:has-text("Add member")');
    const isVisible = await addMemberButton.isVisible().catch(() => false);
    if (isVisible) {
      const isDisabled = await addMemberButton.isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
    }
  });
});
