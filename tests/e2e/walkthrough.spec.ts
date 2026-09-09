import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { TEST_USERS } from '../config/test-env';

const WALKTHROUGH_DIR = path.join(process.cwd(), 'invoice-workflow-walkthrough');

test.describe('Invoice Workflow & Automation Complete User Journey Audit', () => {
  test.setTimeout(120000);

  test('Execute full user journey across 10 phases', async ({ page }) => {
    // ----------------------------------------------------
    // PHASE 1: LOGIN
    // ----------------------------------------------------
    console.log('▶ PHASE 1: Login');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '01-login-screen.png'),
      fullPage: true,
    });

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await emailInput.fill(TEST_USERS.landlord.email);
    await passwordInput.fill(TEST_USERS.landlord.password);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '02-login-form-filled.png'),
      fullPage: true,
    });

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 20000 }).catch(async () => {
      // Fallback to platform admin
      await page.goto('/login');
      await emailInput.fill(TEST_USERS.platformAdmin.email);
      await passwordInput.fill(TEST_USERS.platformAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 20000 });
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '03-dashboard-landing.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 2: NAVIGATION TO INVOICES
    // ----------------------------------------------------
    console.log('▶ PHASE 2: Navigation to Invoices');
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '02-navigation', '01-invoices-hub-overview.png'),
      fullPage: true,
    });

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('INV');
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '02-navigation', '02-invoices-filtered-view.png'),
        fullPage: true,
      });
      await searchInput.clear();
      await page.waitForTimeout(500);
    }

    // ----------------------------------------------------
    // PHASE 3: CREATE AN INVOICE
    // ----------------------------------------------------
    console.log('▶ PHASE 3: Create an Invoice');
    const createBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice"), button:has-text("Add Invoice")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '01-empty-create-form.png'),
      fullPage: true,
    });

    // Fill the invoice form
    const customerNameInput = page.locator('input[name="customerName"], input[placeholder*="Customer"], input[placeholder*="Tenant"]').first();
    if (await customerNameInput.isVisible()) {
      await customerNameInput.fill('Sarah Connor (Residential Tenancy)');
    }

    const customerEmailInput = page.locator('input[name="customerEmail"], input[placeholder*="Email"]').first();
    if (await customerEmailInput.isVisible()) {
      await customerEmailInput.fill('sarah.connor@example.com');
    }

    const descInput = page.locator('input[name*="description"], input[placeholder*="Description"], textarea[placeholder*="Description"]').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Monthly Lease Rent - Unit 4B');
    }

    const amountInput = page.locator('input[name*="amount"], input[name*="unitPrice"], input[type="number"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('2450.00');
    }

    const notesInput = page.locator('textarea[name*="notes"], textarea[placeholder*="Notes"], textarea[placeholder*="terms"]').first();
    if (await notesInput.isVisible()) {
      await notesInput.fill('Payment due via direct deposit. Reference: INV-2026-4401');
    }

    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '02-invoice-form-filled.png'),
      fullPage: true,
    });

    const submitBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save"), button:has-text("Generate Invoice")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2500);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '03-invoice-saved-success.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 4: INVOICE DETAILS
    // ----------------------------------------------------
    console.log('▶ PHASE 4: Invoice Details');
    const firstRow = page.locator('tr, [data-testid="invoice-row"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '04-invoice-details', '01-invoice-detail-modal.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 5: INVOICE PREVIEW
    // ----------------------------------------------------
    console.log('▶ PHASE 5: Invoice Preview');
    const previewTab = page.locator('button:has-text("Preview"), [role="tab"]:has-text("Preview")').first();
    if (await previewTab.isVisible()) {
      await previewTab.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '05-invoice-preview', '01-live-rendered-preview.png'),
      fullPage: true,
    });

    await page.evaluate(() => window.scrollBy(0, 350));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '05-invoice-preview', '02-preview-payment-section.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 6: PDF DOWNLOAD
    // ----------------------------------------------------
    console.log('▶ PHASE 6: PDF Download');
    const pdfBtn = page.locator('button:has-text("Download PDF"), button:has-text("Export PDF"), a:has-text("PDF")').first();
    if (await pdfBtn.isVisible()) {
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '06-invoice-download', '01-pdf-download-button.png'),
        fullPage: true,
      });

      const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
      await pdfBtn.click();
      const download = await downloadPromise;
      if (download) {
        const downloadPath = path.join(WALKTHROUGH_DIR, '06-invoice-download', 'sample_invoice.pdf');
        await download.saveAs(downloadPath);
      }
    }
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '06-invoice-download', '02-pdf-generation-state.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 7: EMAIL WORKFLOW
    // ----------------------------------------------------
    console.log('▶ PHASE 7: Email Workflow');
    const emailBtn = page.locator('button:has-text("Send"), button:has-text("Email Invoice"), button:has-text("Send to Tenant")').first();
    if (await emailBtn.isVisible()) {
      await emailBtn.click();
      await page.waitForTimeout(1200);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '01-email-composer-modal.png'),
        fullPage: true,
      });

      const confirmSendBtn = page.locator('button:has-text("Confirm Send"), button:has-text("Send Now"), button[type="submit"]:has-text("Send")').first();
      if (await confirmSendBtn.isVisible()) {
        await confirmSendBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '02-email-dispatch-status.png'),
        fullPage: true,
      });
    }

    // Close any open modals
    const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("Done")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // ----------------------------------------------------
    // PHASE 8: AUTOMATION WORKFLOW
    // ----------------------------------------------------
    console.log('▶ PHASE 8: Automation Workflow');
    await page.goto('/dashboard/automations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '08-automation', '01-automations-hub-overview.png'),
      fullPage: true,
    });

    const createAutoBtn = page.locator('button:has-text("Create Automation"), button:has-text("New Automation"), button:has-text("Add Automation")').first();
    if (await createAutoBtn.isVisible()) {
      await createAutoBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '02-create-automation-modal.png'),
        fullPage: true,
      });

      const autoName = page.locator('input[placeholder*="Name"], input[name="name"]').first();
      if (await autoName.isVisible()) {
        await autoName.fill('Monthly Lease Rent Billing Automation');
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '03-automation-wizard-configured.png'),
        fullPage: true,
      });
    }

    const historyBtn = page.locator('button:has-text("History"), button:has-text("Logs"), button:has-text("Executions")').first();
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '04-automation-execution-history.png'),
        fullPage: true,
      });
    }

    // ----------------------------------------------------
    // PHASE 9: STATUS LIFECYCLE
    // ----------------------------------------------------
    console.log('▶ PHASE 9: Status Lifecycle');
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '01-invoice-status-overview.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 10: EDGE CASES & VALIDATION
    // ----------------------------------------------------
    console.log('▶ PHASE 10: Edge Cases');
    const newInvoiceBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
    if (await newInvoiceBtn.isVisible()) {
      await newInvoiceBtn.click();
      await page.waitForTimeout(1000);

      const submitModal = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")').first();
      if (await submitModal.isVisible()) {
        await submitModal.click();
        await page.waitForTimeout(800);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '10-edge-cases', '01-empty-submission-validation.png'),
        fullPage: true,
      });
    }
    console.log('🎉 Full user journey completed successfully!');
  });
});
