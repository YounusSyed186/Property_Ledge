import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { TEST_USERS } from '../config/test-env';

const WALKTHROUGH_DIR = path.join(process.cwd(), 'invoice-workflow-walkthrough');

test.describe('Complete Walkthrough Screenshot Pack Generator', () => {
  test.setTimeout(120000);

  test('Generate full comprehensive screenshots for all 10 phases', async ({ page }) => {
    // ----------------------------------------------------
    // PHASE 1: LOGIN
    // ----------------------------------------------------
    console.log('1. Capturing Phase 1: Login');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '01-login-screen.png'),
      fullPage: true,
    });

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passInput = page.locator('input[type="password"], input[name="password"]');
    await emailInput.fill(TEST_USERS.landlord.email);
    await passInput.fill(TEST_USERS.landlord.password);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '02-login-form-filled.png'),
      fullPage: true,
    });

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 20000 }).catch(async () => {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(TEST_USERS.platformAdmin.email);
      await page.locator('input[type="password"]').fill(TEST_USERS.platformAdmin.password);
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
    // PHASE 2: NAVIGATION
    // ----------------------------------------------------
    console.log('2. Capturing Phase 2: Navigation');
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '02-navigation', '01-invoices-hub-overview.png'),
      fullPage: true,
    });

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('INV');
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '02-navigation', '02-invoices-filtered-view.png'),
        fullPage: true,
      });
      await searchInput.clear();
      await page.waitForTimeout(300);
    }

    // ----------------------------------------------------
    // PHASE 3: INVOICE CREATION
    // ----------------------------------------------------
    console.log('3. Capturing Phase 3: Invoice Creation');
    const newInvBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
    await newInvBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '01-empty-create-form.png'),
      fullPage: true,
    });

    // Fill realistic test data
    const nameField = page.locator('input[placeholder*="John Doe"], input[placeholder*="Customer"]').first();
    if (await nameField.isVisible()) await nameField.fill('David Miller (Tenant)');

    const emailField = page.locator('input[placeholder*="billing@customer.com"], input[type="email"]').first();
    if (await emailField.isVisible()) await emailField.fill('david.miller@example.com');

    const descField = page.locator('input[placeholder="Description"]').first();
    if (await descField.isVisible()) await descField.fill('Monthly Residential Tenancy Rent - Unit 4B');

    const unitPriceField = page.locator('input[step="0.01"], input[type="number"]').nth(1);
    if (await unitPriceField.isVisible()) await unitPriceField.fill('2200.00');

    const notesField = page.locator('textarea').first();
    if (await notesField.isVisible()) await notesField.fill('Direct bank deposit due by 15th of the month.');

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '02-invoice-form-filled.png'),
      fullPage: true,
    });

    const saveDraftBtn = page.locator('button:has-text("Save as Draft"), button:has-text("Issue Invoice")').first();
    await saveDraftBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '03-invoice-saved-success.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 4: INVOICE DETAILS
    // ----------------------------------------------------
    console.log('4. Capturing Phase 4: Invoice Details');
    const viewBtn = page.locator('button:has-text("View")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '04-invoice-details', '01-invoice-detail-modal.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 5: INVOICE PREVIEW
    // ----------------------------------------------------
    console.log('5. Capturing Phase 5: Invoice Preview');
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '05-invoice-preview', '01-live-rendered-preview.png'),
      fullPage: true,
    });

    // ----------------------------------------------------
    // PHASE 6: PDF DOWNLOAD
    // ----------------------------------------------------
    console.log('6. Capturing Phase 6: PDF Download');
    const pdfBtn = page.locator('button:has-text("PDF")').first();
    if (await pdfBtn.isVisible()) {
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '06-invoice-download', '01-pdf-download-action.png'),
        fullPage: true,
      });
      // Click download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 6000 }).catch(() => null),
        pdfBtn.click()
      ]);
      if (download) {
        await download.saveAs(path.join(WALKTHROUGH_DIR, '06-invoice-download', 'PropertyLedge_Invoice.pdf'));
      }
    }

    // ----------------------------------------------------
    // PHASE 7: EMAIL WORKFLOW
    // ----------------------------------------------------
    console.log('7. Capturing Phase 7: Email Workflow');
    const sendEmailBtn = page.locator('button:has-text("Send via Email")').first();
    if (await sendEmailBtn.isVisible()) {
      await sendEmailBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '01-email-composer-modal.png'),
        fullPage: true,
      });

      const confirmEmailBtn = page.locator('button:has-text("Send Email Now"), button:has-text("Send")').first();
      if (await confirmEmailBtn.isVisible()) {
        await confirmEmailBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '02-email-status-feedback.png'),
        fullPage: true,
      });
    }

    // Close invoice detail modal
    const closeDetail = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
    if (await closeDetail.isVisible()) {
      await closeDetail.click();
      await page.waitForTimeout(500);
    }

    // ----------------------------------------------------
    // PHASE 8: AUTOMATION WORKFLOW
    // ----------------------------------------------------
    console.log('8. Capturing Phase 8: Automation Workflow');
    await page.goto('/dashboard/automations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '08-automation', '01-automations-hub-overview.png'),
      fullPage: true,
    });

    const createAuto = page.locator('button:has-text("Create Automation"), button:has-text("New Automation"), button:has-text("Add Automation")').first();
    if (await createAuto.isVisible()) {
      await createAuto.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '02-create-automation-modal.png'),
        fullPage: true,
      });

      const autoName = page.locator('input[placeholder*="Name"], input[name="name"]').first();
      if (await autoName.isVisible()) {
        await autoName.fill('Monthly Lease Recurring Invoicing & Dispatch');
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '03-automation-wizard-configured.png'),
        fullPage: true,
      });

      const closeAutoModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
      if (await closeAutoModal.isVisible()) {
        await closeAutoModal.click();
        await page.waitForTimeout(500);
      }
    }

    const histBtn = page.locator('button:has-text("History"), button:has-text("Executions"), button:has-text("Logs")').first();
    if (await histBtn.isVisible()) {
      await histBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '04-automation-execution-history.png'),
        fullPage: true,
      });
    }

    // ----------------------------------------------------
    // PHASE 9: STATUS LIFECYCLE
    // ----------------------------------------------------
    console.log('9. Capturing Phase 9: Status Lifecycle');
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const viewFirst = page.locator('button:has-text("View")').first();
    if (await viewFirst.isVisible()) {
      await viewFirst.click();
      await page.waitForTimeout(1000);

      const payBtn = page.locator('button:has-text("Record Payment")').first();
      if (await payBtn.isVisible()) {
        await payBtn.click();
        await page.waitForTimeout(800);

        await page.screenshot({
          path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '01-record-payment-form.png'),
          fullPage: true,
        });

        const paySubmit = page.locator('button:has-text("Record"), button:has-text("Confirm Payment"), button:has-text("Save Payment")').first();
        if (await paySubmit.isVisible()) {
          await paySubmit.click();
          await page.waitForTimeout(1500);
        }

        await page.screenshot({
          path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '02-status-paid.png'),
          fullPage: true,
        });
      }
    }

    // ----------------------------------------------------
    // PHASE 10: EDGE CASES
    // ----------------------------------------------------
    console.log('10. Capturing Phase 10: Edge Cases');
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const createEdgeBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
    if (await createEdgeBtn.isVisible()) {
      await createEdgeBtn.click();
      await page.waitForTimeout(800);

      const submitEdge = page.locator('button:has-text("Save as Draft"), button:has-text("Issue Invoice")').first();
      if (await submitEdge.isVisible()) {
        await submitEdge.click();
        await page.waitForTimeout(800);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '10-edge-cases', '01-empty-submission-validation.png'),
        fullPage: true,
      });

      const numField = page.locator('input[type="number"]').first();
      if (await numField.isVisible()) {
        await numField.fill('-500');
        await page.waitForTimeout(400);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '10-edge-cases', '02-negative-amount-handling.png'),
        fullPage: true,
      });
    }

    console.log('✨ All 10 user journey walkthrough screenshot sets captured cleanly!');
  });
});
