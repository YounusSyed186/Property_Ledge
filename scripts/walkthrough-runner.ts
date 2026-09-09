import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROOT_DIR = process.cwd();
const WALKTHROUGH_DIR = path.join(ROOT_DIR, 'invoice-workflow-walkthrough');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWalkthrough() {
  console.log('🚀 Starting Invoice Creation & Automation Walkthrough...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  
  const page = await context.newPage();

  try {
    // ----------------------------------------------------
    // PHASE 1: LOGIN
    // ----------------------------------------------------
    console.log('▶ PHASE 1: Login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '01-login-screen.png'),
      fullPage: true
    });

    // Try landlord login first, fallback to platform admin
    console.log('Entering credentials...');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await emailInput.fill('landlord@test.com');
    await passwordInput.fill('TestPassword123!');
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '02-login-form-filled.png'),
      fullPage: true
    });

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 }).catch(async () => {
      console.log('Fallback to admin credentials if landlord login did not redirect...');
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[type="email"]').fill('admin@propertyledge.com.au');
      await page.locator('input[type="password"]').fill('admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 15000 });
    });

    await page.waitForLoadState('networkidle');
    await sleep(1500);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '01-login', '03-dashboard-landing.png'),
      fullPage: true
    });
    console.log('✓ Phase 1 complete.');

    // ----------------------------------------------------
    // PHASE 2: NAVIGATION TO INVOICES
    // ----------------------------------------------------
    console.log('▶ PHASE 2: Navigate to Invoices');
    await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '02-navigation', '01-invoices-hub-overview.png'),
      fullPage: true
    });

    // Interact with search / filters if available
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('INV-');
      await sleep(500);
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '02-navigation', '02-invoices-filtered-view.png'),
        fullPage: true
      });
      await searchInput.clear();
      await sleep(500);
    }
    console.log('✓ Phase 2 complete.');

    // ----------------------------------------------------
    // PHASE 3: CREATE AN INVOICE
    // ----------------------------------------------------
    console.log('▶ PHASE 3: Create an Invoice');
    // Find Create Invoice button
    const createBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice"), button:has-text("Add Invoice")').first();
    await createBtn.click();
    await sleep(1000);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '01-empty-invoice-modal.png'),
      fullPage: true
    });

    // Test form fields
    console.log('Filling invoice form...');
    // If property select exists
    const propertySelect = page.locator('select[name="propertyId"], [role="combobox"]:has-text("property"), select:has-text("Property")').first();
    if (await propertySelect.isVisible()) {
      const options = await propertySelect.locator('option').all();
      if (options.length > 1) {
        await propertySelect.selectOption({ index: 1 });
      }
    }

    // Tenant / Customer details
    const customerNameInput = page.locator('input[name="customerName"], input[placeholder*="Customer"], input[placeholder*="Tenant"]').first();
    if (await customerNameInput.isVisible()) {
      await customerNameInput.fill('Sarah Connor (Tenant)');
    }

    const customerEmailInput = page.locator('input[name="customerEmail"], input[type="email"]').first();
    if (await customerEmailInput.isVisible()) {
      await customerEmailInput.fill('sarah.connor@example.com');
    }

    // Line items or Amount
    const descriptionInput = page.locator('input[name*="description"], input[placeholder*="Description"], textarea[placeholder*="Description"]').first();
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Monthly Residential Rent - Unit 4B');
    }

    const amountInput = page.locator('input[name*="amount"], input[name*="unitPrice"], input[type="number"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('2450.00');
    }

    const notesInput = page.locator('textarea[name*="notes"], textarea[placeholder*="Notes"], textarea[placeholder*="terms"]').first();
    if (await notesInput.isVisible()) {
      await notesInput.fill('Payment due via direct bank transfer to PropertyLedge Operating Account. Reference: INV-2026-0042');
    }

    await sleep(1000);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '02-invoice-form-filled.png'),
      fullPage: true
    });

    // Submit Create Invoice
    const submitBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save"), button:has-text("Generate Invoice")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await sleep(2500);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '03-invoice-creation', '03-invoice-created-success.png'),
      fullPage: true
    });
    console.log('✓ Phase 3 complete.');

    // ----------------------------------------------------
    // PHASE 4: INVOICE DETAILS
    // ----------------------------------------------------
    console.log('▶ PHASE 4: Invoice Details');
    // Click on the first invoice row or view details
    const firstInvoice = page.locator('tr:has-text("INV"), [data-testid="invoice-row"], div:has-text("INV-")').first();
    if (await firstInvoice.isVisible()) {
      await firstInvoice.click();
      await sleep(1500);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '04-invoice-details', '01-invoice-detail-view.png'),
      fullPage: true
    });
    console.log('✓ Phase 4 complete.');

    // ----------------------------------------------------
    // PHASE 5: INVOICE PREVIEW
    // ----------------------------------------------------
    console.log('▶ PHASE 5: Invoice Preview');
    const previewTab = page.locator('button:has-text("Preview"), [role="tab"]:has-text("Preview")').first();
    if (await previewTab.isVisible()) {
      await previewTab.click();
      await sleep(1500);
    }

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '05-invoice-preview', '01-live-invoice-preview.png'),
      fullPage: true
    });

    // Scroll to payment details & notes in preview
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(800);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '05-invoice-preview', '02-preview-payment-terms.png'),
      fullPage: true
    });
    console.log('✓ Phase 5 complete.');

    // ----------------------------------------------------
    // PHASE 6: PDF DOWNLOAD
    // ----------------------------------------------------
    console.log('▶ PHASE 6: PDF Download');
    const pdfBtn = page.locator('button:has-text("Download PDF"), button:has-text("Export PDF"), a:has-text("PDF")').first();
    if (await pdfBtn.isVisible()) {
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '06-invoice-download', '01-pdf-download-action.png'),
        fullPage: true
      });
      
      // Download listener
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        pdfBtn.click()
      ]);

      if (download) {
        const downloadPath = path.join(WALKTHROUGH_DIR, '06-invoice-download', 'downloaded_invoice.pdf');
        await download.saveAs(downloadPath);
        console.log(`Saved PDF to ${downloadPath}`);
      }
    }
    
    await sleep(1500);
    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '06-invoice-download', '02-pdf-generation-view.png'),
      fullPage: true
    });
    console.log('✓ Phase 6 complete.');

    // ----------------------------------------------------
    // PHASE 7: EMAIL WORKFLOW
    // ----------------------------------------------------
    console.log('▶ PHASE 7: Email Workflow');
    const sendEmailBtn = page.locator('button:has-text("Send"), button:has-text("Email Invoice"), button:has-text("Send to Tenant")').first();
    if (await sendEmailBtn.isVisible()) {
      await sendEmailBtn.click();
      await sleep(1500);
      
      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '01-email-composer-modal.png'),
        fullPage: true
      });

      // Attempt send to observe handling & feedback
      const confirmSendBtn = page.locator('button:has-text("Confirm Send"), button:has-text("Send Now"), button[type="submit"]:has-text("Send")').first();
      if (await confirmSendBtn.isVisible()) {
        await confirmSendBtn.click();
        await sleep(2500);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '07-email', '02-email-status-feedback.png'),
        fullPage: true
      });
    }
    console.log('✓ Phase 7 complete.');

    // ----------------------------------------------------
    // PHASE 8: AUTOMATION WORKFLOW
    // ----------------------------------------------------
    console.log('▶ PHASE 8: Automation Workflow');
    await page.goto(`${BASE_URL}/dashboard/automations`, { waitUntil: 'networkidle' });
    await sleep(2000);

    await page.screenshot({
      path: path.join(WALKTHROUGH_DIR, '08-automation', '01-automations-hub.png'),
      fullPage: true
    });

    const createAutoBtn = page.locator('button:has-text("Create Automation"), button:has-text("New Automation")').first();
    if (await createAutoBtn.isVisible()) {
      await createAutoBtn.click();
      await sleep(1500);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '02-create-automation-wizard.png'),
        fullPage: true
      });

      // Fill automation details
      const nameInput = page.locator('input[placeholder*="Name"], input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Automated Monthly Rent Generation & Tenant Dispatch');
      }

      const autoTypeSelect = page.locator('select[name="type"], button:has-text("Lease Recurring Invoice"), div:has-text("Recurring Invoice")').first();
      if (await autoTypeSelect.isVisible()) {
        await autoTypeSelect.click();
        await sleep(500);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '03-automation-configured.png'),
        fullPage: true
      });

      // Save automation if modal has save
      const saveAutoBtn = page.locator('button:has-text("Create"), button:has-text("Save Automation"), button[type="submit"]').first();
      if (await saveAutoBtn.isVisible()) {
        await saveAutoBtn.click();
        await sleep(2000);
      }

      // Open Execution History or trigger automation
      const historyBtn = page.locator('button:has-text("History"), button:has-text("Logs"), button:has-text("Executions")').first();
      if (await historyBtn.isVisible()) {
        await historyBtn.click();
        await sleep(1500);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '08-automation', '04-automation-execution-history.png'),
        fullPage: true
      });
    }
    console.log('✓ Phase 8 complete.');

    // ----------------------------------------------------
    // PHASE 9: STATUS LIFECYCLE
    // ----------------------------------------------------
    console.log('▶ PHASE 9: Status Lifecycle');
    await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Open an invoice and check status transition actions
    const invoiceRow = page.locator('tr, [data-testid="invoice-row"]').first();
    if (await invoiceRow.isVisible()) {
      await invoiceRow.click();
      await sleep(1000);

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '01-invoice-status-controls.png'),
        fullPage: true
      });

      const markPaidBtn = page.locator('button:has-text("Mark as Paid"), button:has-text("Record Payment")').first();
      if (await markPaidBtn.isVisible()) {
        await markPaidBtn.click();
        await sleep(1500);
        await page.screenshot({
          path: path.join(WALKTHROUGH_DIR, '09-status-lifecycle', '02-invoice-status-paid.png'),
          fullPage: true
        });
      }
    }
    console.log('✓ Phase 9 complete.');

    // ----------------------------------------------------
    // PHASE 10: EDGE CASES & VALIDATION
    // ----------------------------------------------------
    console.log('▶ PHASE 10: Edge Cases & Validation');
    await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'networkidle' });
    await sleep(1500);

    const newInvBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
    if (await newInvBtn.isVisible()) {
      await newInvBtn.click();
      await sleep(1000);

      // Attempt to submit empty form to trigger validations
      const submitModalBtn = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")').first();
      if (await submitModalBtn.isVisible()) {
        await submitModalBtn.click();
        await sleep(1000);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '10-edge-cases', '01-validation-errors-empty-form.png'),
        fullPage: true
      });

      // Test negative amount / invalid date
      const amountField = page.locator('input[name*="amount"], input[name*="unitPrice"], input[type="number"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('-500');
        await sleep(500);
      }

      await page.screenshot({
        path: path.join(WALKTHROUGH_DIR, '10-edge-cases', '02-negative-amount-handling.png'),
        fullPage: true
      });
    }
    console.log('✓ Phase 10 complete.');

  } catch (error) {
    console.error('Error during walkthrough:', error);
  } finally {
    await browser.close();
    console.log('🎉 Browser session completed.');
  }
}

runWalkthrough();
