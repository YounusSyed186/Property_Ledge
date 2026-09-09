import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

const WALKTHROUGH_DIR = path.join(process.cwd(), 'invoice-workflow-walkthrough');

test('Capture Email, History, and Status lifecycle screenshots', async ({ page }) => {
  test.setTimeout(90000);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 20000 });

  // Invoices
  await page.goto('/dashboard/invoices');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Open First Invoice Detail Modal
  const viewBtn = page.locator('button:has-text("View")').first();
  if (await viewBtn.isVisible()) {
    await viewBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 07-email: Send via Email
    const emailBtn = page.locator('button:has-text("Send via Email")').first();
    if (await emailBtn.isVisible()) {
      await emailBtn.click({ force: true });
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '01-email-composer-modal.png'),
        fullPage: true,
      });

      const confirmSend = page.locator('button:has-text("Send Email Now")').first();
      if (await confirmSend.isVisible()) {
        await confirmSend.click({ force: true }).catch(() => {});
        await page.waitForTimeout(2000);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '02-email-status-feedback.png'),
        fullPage: true,
      });
    }

    // 09-status-lifecycle: Record Payment
    const payBtn = page.locator('button:has-text("Record Payment")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click({ force: true });
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '01-record-payment-form.png'),
        fullPage: true,
      });

      const confirmPay = page.locator('button:has-text("Confirm Payment"), button:has-text("Save Payment")').first();
      if (await confirmPay.isVisible()) {
        await confirmPay.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '02-status-paid.png'),
        fullPage: true,
      });
    }

    // Close detail modal
    const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // 08-automation: Execution History
  await page.goto('/dashboard/automations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const histBtn = page.locator('button:has-text("History"), button:has-text("Executions"), button:has-text("Logs")').first();
  if (await histBtn.isVisible()) {
    await histBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  await page.screenshot({
    path: path.join(WALKTHROUGH_DIR, '08-automation', '04-automation-execution-history.png'),
    fullPage: true,
  });

  console.log('✓ All finish phase screenshots captured!');
});
