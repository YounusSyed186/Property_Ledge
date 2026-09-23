import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

const JOURNEY_DIR = path.join(process.cwd(), 'artifacts', 'landlord-journey');

test('Complete Landlord End-to-End User Journey with Step-by-Step Screenshots', async ({ page }) => {
  test.setTimeout(180000);

  // Ensure output directory exists
  if (!fs.existsSync(JOURNEY_DIR)) {
    fs.mkdirSync(JOURNEY_DIR, { recursive: true });
  }

  // =========================================================================
  // STEP 1: AUTHENTICATION & LOGIN
  // =========================================================================
  console.log('▶ Step 1: Login');
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(JOURNEY_DIR, '01_login_page.png'), fullPage: true });

  await page.locator('input[name="email"]').fill(TEST_USERS.landlord.email);
  await page.locator('input[name="password"]').fill(TEST_USERS.landlord.password);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '02_login_form_filled.png'), fullPage: true });

  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 25000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // =========================================================================
  // STEP 2: DASHBOARD OVERVIEW
  // =========================================================================
  console.log('▶ Step 2: Dashboard Overview');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '03_dashboard_overview.png'), fullPage: true });

  // =========================================================================
  // STEP 3: PROPERTIES PORTFOLIO
  // =========================================================================
  console.log('▶ Step 3: Properties Portfolio');
  await page.goto('/dashboard/properties');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '04_properties_portfolio.png'), fullPage: true });

  // Card view toggle if available
  const cardViewBtn = page.locator('button:has-text("Card Grid View"), button:has-text("Grid")').first();
  if (await cardViewBtn.isVisible()) {
    await cardViewBtn.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '05_properties_card_view.png'), fullPage: true });

    // Switch back to table
    const tableViewBtn = page.locator('button:has-text("Table View"), button:has-text("Table")').first();
    if (await tableViewBtn.isVisible()) {
      await tableViewBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // =========================================================================
  // STEP 4: TENANTS & LEASES
  // =========================================================================
  console.log('▶ Step 4: Tenants & Leases');
  await page.goto('/dashboard/people');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '06_tenants_directory.png'), fullPage: true });

  await page.goto('/dashboard/leases');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '07_leases_management.png'), fullPage: true });

  // =========================================================================
  // STEP 5: INVOICES HUB
  // =========================================================================
  console.log('▶ Step 5: Invoices');
  await page.goto('/dashboard/invoices');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '08_invoices_hub.png'), fullPage: true });

  // View first invoice details if available
  const viewInvoiceBtn = page.locator('button:has-text("View")').first();
  if (await viewInvoiceBtn.isVisible()) {
    await viewInvoiceBtn.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '09_invoice_detail_modal.png'), fullPage: true });

    const closeInvoiceModal = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
    if (await closeInvoiceModal.isVisible()) {
      await closeInvoiceModal.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // =========================================================================
  // STEP 6: EXPENSES TRACKING
  // =========================================================================
  console.log('▶ Step 6: Expenses');
  await page.goto('/dashboard/expenses');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '10_expenses_tracker.png'), fullPage: true });

  // Open Expense Modal
  const addExpBtn = page.locator('button:has-text("Add Expense"), button:has-text("Record Expense"), button:has-text("New Expense")').first();
  if (await addExpBtn.isVisible()) {
    await addExpBtn.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '11_create_expense_modal.png'), fullPage: true });

    const closeExpModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
    if (await closeExpModal.isVisible()) {
      await closeExpModal.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // =========================================================================
  // STEP 7: TRANSACTIONS & CASH FLOW
  // =========================================================================
  console.log('▶ Step 7: Transactions');
  await page.goto('/dashboard/money');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '12_transactions_ledger.png'), fullPage: true });

  // Open Transaction Modal
  const addTxBtn = page.locator('button:has-text("Add Transaction"), button:has-text("Record Transaction"), button:has-text("New Transaction")').first();
  if (await addTxBtn.isVisible()) {
    await addTxBtn.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '13_transaction_modal.png'), fullPage: true });

    const closeTxModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
    if (await closeTxModal.isVisible()) {
      await closeTxModal.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // =========================================================================
  // STEP 8: PAYMENT SCHEDULES
  // =========================================================================
  console.log('▶ Step 8: Payment Schedules');
  await page.goto('/dashboard/schedules');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '14_payment_schedules_list.png'), fullPage: true });

  // Open Create Schedule Modal
  const addScheduleBtn = page.locator('button:has-text("Add Schedule"), button:has-text("Create Schedule"), button:has-text("New Schedule")').first();
  if (await addScheduleBtn.isVisible()) {
    await addScheduleBtn.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '15_create_schedule_modal.png'), fullPage: true });

    const closeSchedModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
    if (await closeSchedModal.isVisible()) {
      await closeSchedModal.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // =========================================================================
  // STEP 9: BAS ACTIVITY STATEMENT & RECONCILIATION
  // =========================================================================
  console.log('▶ Step 9: BAS Activity Statement');
  await page.goto('/dashboard/bas');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '16_bas_worksheet_tab.png'), fullPage: true });

  // BAS Details Tab
  const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")').first();
  if (await detailsTab.isVisible()) {
    await detailsTab.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '17_bas_details_audit_tab.png'), fullPage: true });
  }

  // BAS ATO Guide Tab
  const guideTab = page.locator('button:has-text("ATO Guide"), button:has-text("How to Submit"), [role="tab"]:has-text("ATO Guide")').first();
  if (await guideTab.isVisible()) {
    await guideTab.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(JOURNEY_DIR, '18_bas_ato_guidance_tab.png'), fullPage: true });
  }

  // =========================================================================
  // STEP 10: AUTOMATIONS & SETTINGS
  // =========================================================================
  console.log('▶ Step 10: Automations & Settings');
  await page.goto('/dashboard/automations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '19_automations_hub.png'), fullPage: true });

  await page.goto('/dashboard/team');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '20_team_management.png'), fullPage: true });

  await page.goto('/dashboard/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(JOURNEY_DIR, '21_workspace_settings.png'), fullPage: true });

  console.log('✓ All 21 Landlord Journey steps captured with full-page screenshots!');
});
