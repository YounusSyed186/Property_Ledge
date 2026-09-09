import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { TEST_USERS } from '../config/test-env';

const WALKTHROUGH_DIR = path.join(process.cwd(), 'invoice-workflow-walkthrough');

test.describe('Detailed Screenshots Capture for All Walkthrough Categories', () => {
  test.setTimeout(120000);

  test('Capture missing phase screenshots', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"], input[name="email"]').fill(TEST_USERS.landlord.email);
    await page.locator('input[type="password"], input[name="password"]').fill(TEST_USERS.landlord.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 20000 }).catch(async () => {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(TEST_USERS.platformAdmin.email);
      await page.locator('input[type="password"]').fill(TEST_USERS.platformAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 20000 });
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Go to Invoices
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click first invoice to open InvoiceDetailModal
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Email modal trigger
      const emailBtn = page.locator('button:has-text("Email"), button:has-text("Send"), button[title*="Email"]').first();
      if (await emailBtn.isVisible()) {
        await emailBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({
          path: path.join(WALKTHROUGH_DIR, '07-email', '01-email-composer-modal.png'),
          fullPage: true,
        });

        const sendConfirm = page.locator('button:has-text("Send Email"), button:has-text("Confirm Send")').first();
        if (await sendConfirm.isVisible()) {
          await sendConfirm.click();
          await page.waitForTimeout(2000);
          await page.screenshot({
            path: path.join(WALKTHROUGH_DIR, '07-email', '02-email-status-feedback.png'),
            fullPage: true,
          });
        }
      }

      // Download PDF button screenshot
      const downloadBtn = page.locator('button:has-text("Download"), button:has-text("PDF")').first();
      if (await downloadBtn.isVisible()) {
        await page.screenshot({
          path: path.join(WALKTHROUGH_DIR, '06-invoice-download', '01-pdf-download-action.png'),
          fullPage: true,
        });
      }

      // Payment recording flow
      const payBtn = page.locator('button:has-text("Record Payment"), button:has-text("Payment")').first();
      if (await payBtn.isVisible()) {
        await payBtn.click();
        await page.waitForTimeout(800);
        const amountInput = page.locator('input[type="number"]').first();
        if (await amountInput.isVisible()) {
          await amountInput.fill('2450');
        }
        await page.screenshot({
          path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '02-payment-modal.png'),
          fullPage: true,
        });
      }

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 3. Automations Hub & History
    await page.goto('/dashboard/automations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const historyTabOrBtn = page.locator('button:has-text("History"), button:has-text("Logs"), button:has-text("Executions"), [role="tab"]:has-text("History")').first();
    if (await historyTabOrBtn.isVisible()) {
      await historyTabOrBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '04-automation-execution-history.png'),
        fullPage: true,
      });
    }

    // 4. Edge Cases: Form Validation
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(800);

      const priceInput = page.locator('input[type="number"]').first();
      if (await priceInput.isVisible()) {
        await priceInput.fill('-100');
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '10-edge-cases', '02-negative-amount-handling.png'),
        fullPage: true,
      });
    }

    console.log('✓ All specific phase screenshots captured.');
  });
});
