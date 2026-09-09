import { test, expect } from '@playwright/test';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

const WALKTHROUGH_DIR = path.join(process.cwd(), 'invoice-workflow-walkthrough');

test('Fast targeted capture of email, paid status, and execution history', async ({ page }) => {
  test.setTimeout(90000);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

  // 1. Go to Invoices
  await page.goto('/dashboard/invoices');
  await page.waitForSelector('button:has-text("New Invoice")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Click View button in table
  const viewButton = page.locator('button:has-text("View")').first();
  await viewButton.click();
  await page.waitForTimeout(1000);

  // Click "Send via Email" button inside the modal
  const sendEmailBtn = page.locator('button:has-text("Send via Email")').first();
  if (await sendEmailBtn.isVisible()) {
    await sendEmailBtn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '07-email', '01-email-composer-modal.png'),
      fullPage: true,
    });

    // Click "Send Email Now"
    const sendNowBtn = page.locator('button:has-text("Send Email Now")').first();
    if (await sendNowBtn.isVisible()) {
      await sendNowBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '02-email-status-feedback.png'),
        fullPage: true,
      });
    }
  }

  // Record payment inside modal
  const recordPayBtn = page.locator('button:has-text("Record Payment")').first();
  if (await recordPayBtn.isVisible()) {
    await recordPayBtn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '01-record-payment-form.png'),
      fullPage: true,
    });

    const confirmPayBtn = page.locator('button:has-text("Record Payment")').last();
    if (await confirmPayBtn.isVisible()) {
      await confirmPayBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '02-status-paid.png'),
        fullPage: true,
      });
    }
  }

  // Close modal
  const closeBtn = page.locator('button:has-text("✕"), button:has-text("Close"), svg.lucide-x').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }

  // 2. Go to Automations & capture history
  await page.goto('/dashboard/automations');
  await page.waitForSelector('button:has-text("Create Automation"), button:has-text("New Automation")', { timeout: 15000 });
  await page.waitForTimeout(800);

  const historyBtn = page.locator('button:has-text("History"), button:has-text("Logs"), button:has-text("Executions")').first();
  if (await historyBtn.isVisible()) {
    await historyBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
  await page.screenshot({
    path: path.join(WALKTHROUGH_DIR, '08-automation', '04-automation-execution-history.png'),
    fullPage: true,
  });

  console.log('✓ Fast targeted captures completed.');
});
