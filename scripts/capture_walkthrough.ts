import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/4e5a0533-f063-4582-8292-e9300f56a270';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeModals(page: any) {
  try {
    const xButtons = await page.locator('.fixed button:has(svg)').all();
    for (const btn of xButtons) {
      if (await btn.isVisible()) {
        await btn.click({ force: true }).catch(() => {});
        await sleep(300);
      }
    }
  } catch (e) {}
  await page.keyboard.press('Escape');
  await sleep(600);
}

async function run() {
  console.log('🚀 Starting Exact Screenshot Capture for Automations & Status Lifecycle...');

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

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
    // ---------------------------------------------------------------------
    // PART A: AUTOMATIONS SCREENSHOTS
    // ---------------------------------------------------------------------
    console.log('▶ Navigating to Automations Hub (/dashboard/automations)...');
    await page.goto(`${BASE_URL}/dashboard/automations`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    console.log('▶ [1/10] Capturing Automations Dashboard...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '01_automations_dashboard.png'),
      fullPage: true
    });

    // 2. Open Create Automation Modal (Step 0: Choose Automation Type)
    console.log('▶ [2/10] Opening Create Automation Modal...');
    const createBtn = page.locator('button:has-text("Create Automation")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await sleep(1200);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '02_create_automation_type_selector.png'),
        fullPage: true
      });

      // 3. Select Lease Automation & Next -> Step 1 Lease Config Form
      console.log('▶ [3/10] Capturing Lease Automation Config Form...');
      const leaseCard = page.locator('button:has-text("Lease Recurring Invoice"), div:has-text("Lease Automation")').first();
      if (await leaseCard.isVisible()) {
        await leaseCard.click();
        await sleep(600);
      }
      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await sleep(1500);
      }

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '03_create_lease_automation_modal.png'),
        fullPage: true
      });

      await closeModals(page);
    }

    // 4. Open Modal & Select Standalone Invoice Automation
    console.log('▶ [4/10] Capturing Standalone Invoice Automation Form...');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await sleep(1200);

      const standaloneCard = page.locator('button:has-text("Standalone Customer Billing"), div:has-text("Standalone Invoice")').first();
      if (await standaloneCard.isVisible()) {
        await standaloneCard.click();
        await sleep(600);
      }

      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await sleep(1500);
      }

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '04_create_standalone_invoice_automation_modal.png'),
        fullPage: true
      });

      await closeModals(page);
    }

    // 5. Automation Execution History Modal
    console.log('▶ [5/10] Capturing Execution History Modal...');
    const historyBtn = page.locator('button[title="Execution History"]').first();
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await sleep(1500);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '05_automation_execution_logs_modal.png'),
        fullPage: true
      });

      await closeModals(page);
    }

    // 6. Trigger Confirmation Modal
    console.log('▶ [6/10] Capturing Trigger Confirmation Modal...');
    const triggerBtn = page.locator('button:has-text("Trigger")').first();
    if (await triggerBtn.isVisible()) {
      await triggerBtn.click();
      await sleep(1500);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '06_trigger_confirmation_modal.png'),
        fullPage: true
      });

      await closeModals(page);
    }

    // ---------------------------------------------------------------------
    // PART B: INVOICES & STATUS LIFECYCLE SCREENSHOTS
    // ---------------------------------------------------------------------
    console.log('▶ Navigating to Invoices Dashboard (/dashboard/invoices)...');
    await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    console.log('▶ [7/10] Capturing Invoices Hub Overview & Filter Tabs...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '07_invoices_dashboard_status_lifecycle.png'),
      fullPage: true
    });

    // 8. Open Invoice Detail Modal (Status Lifecycle Controls)
    console.log('▶ [8/10] Capturing Invoice Status Detail & Workflow Controls Modal...');
    const firstInvoiceCell = page.locator('.ag-row, table tbody tr').first();
    if (await firstInvoiceCell.isVisible()) {
      await firstInvoiceCell.click();
      await sleep(1500);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '08_invoice_status_draft.png'),
        fullPage: true
      });

      // 9. Payment Recording Form inside Invoice Detail Modal
      console.log('▶ [9/10] Capturing Payment Recording Subform...');
      const recordPaymentBtn = page.locator('button:has-text("Record Payment")').first();
      if (await recordPaymentBtn.isVisible()) {
        await recordPaymentBtn.click();
        await sleep(1200);

        await page.screenshot({
          path: path.join(ARTIFACT_DIR, '09_payment_recording_form.png'),
          fullPage: true
        });

        await closeModals(page);
      }

      await closeModals(page);
    }

    // 10. Filter by Overdue Status
    console.log('▶ [10/10] Capturing Overdue Status Filter View...');
    const overdueTab = page.locator('button:has-text("Overdue"), [role="tab"]:has-text("Overdue")').first();
    if (await overdueTab.isVisible()) {
      await overdueTab.click();
      await sleep(1200);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, '10_invoice_status_overdue.png'),
        fullPage: true
      });
    }

    console.log('🎉 Screenshot capture completed successfully!');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
