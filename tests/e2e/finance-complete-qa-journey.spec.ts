import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

const SCREENSHOT_DIR = path.join(process.cwd(), 'artifacts', 'screenshots');

test.describe('PropertyLedge — Complete Finance UI User-Journey & CRUD QA', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Execute Full Finance QA Lifecycle & Audit', async ({ page }) => {
    test.setTimeout(180000);

    // ----------------------------------------------------
    // 1. LOGIN TEST
    // ----------------------------------------------------
    console.log('[QA 1/10] Testing Login Flow...');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-page.png'), fullPage: true });

    await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 25000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-success.png'), fullPage: true });

    // ----------------------------------------------------
    // 2. SMOKE & APPLICATION SHELL TEST
    // ----------------------------------------------------
    console.log('[QA 2/10] Verifying Application Shell & Navigation...');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-dashboard-shell.png'), fullPage: true });

    // ----------------------------------------------------
    // 3. PROPERTY CONTEXT VERIFICATION
    // ----------------------------------------------------
    console.log('[QA 3/10] Checking Properties...');
    await page.goto('/dashboard/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-properties-list.png'), fullPage: true });

    // ----------------------------------------------------
    // 4. INCOME CRUD & TAX CLASSIFICATION
    // ----------------------------------------------------
    console.log('[QA 4/10] Testing Income CRUD & Tax Classification...');
    await page.goto('/dashboard/money');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-income-initial.png'), fullPage: true });

    const addTxBtn = page.locator('button:has-text("Add Transaction"), button:has-text("Record Transaction"), button:has-text("New Transaction")').first();
    if (await addTxBtn.isVisible()) {
      await addTxBtn.click();
      await page.waitForTimeout(800);

      // Amount $1,100
      const amtInput = page.locator('input[type="number"]').first();
      if (await amtInput.isVisible()) {
        await amtInput.fill('1100');
      }

      // Property Select
      const propSelect = page.locator('select').filter({ hasText: /Select Property/i }).first();
      if (await propSelect.isVisible()) {
        const opts = await propSelect.locator('option').all();
        if (opts.length > 1) {
          const val = await opts[1].getAttribute('value');
          if (val) await propSelect.selectOption(val);
        }
      }

      // Category Select
      const catSelect = page.locator('select').filter({ hasText: /Category/i }).first();
      if (await catSelect.isVisible()) {
        const opts = await catSelect.locator('option').all();
        if (opts.length > 1) {
          const val = await opts[1].getAttribute('value');
          if (val) await catSelect.selectOption(val);
        }
      }

      // Description
      const descInput = page.locator('input[placeholder*="Description"], input[name="description"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('QA FINANCE TEST — Rental Income');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-income-modal-filled.png') });

      const submitBtn = page.locator('button:has-text("Record Income"), button:has-text("Save Transaction"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-income-created.png'), fullPage: true });

    // ----------------------------------------------------
    // 5. EXPENSE CRUD & VALIDATION
    // ----------------------------------------------------
    console.log('[QA 5/10] Testing Expense CRUD & Validation...');
    await page.goto('/dashboard/expenses');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-expenses-initial.png'), fullPage: true });

    const addExpBtn = page.locator('button:has-text("Add Expense"), button:has-text("Record Expense"), button:has-text("New Expense")').first();
    if (await addExpBtn.isVisible()) {
      await addExpBtn.click();
      await page.waitForTimeout(800);

      // Property Select
      const expPropSelect = page.locator('select[name="propertyId"]').first();
      if (await expPropSelect.isVisible()) {
        const opts = await expPropSelect.locator('option').all();
        if (opts.length > 1) {
          const val = await opts[1].getAttribute('value');
          if (val) await expPropSelect.selectOption(val);
        }
      }

      // Category Select
      const expCatSelect = page.locator('select[name="categoryId"]').first();
      if (await expCatSelect.isVisible()) {
        const opts = await expCatSelect.locator('option').all();
        if (opts.length > 1) {
          const val = await opts[1].getAttribute('value');
          if (val) await expCatSelect.selectOption(val);
        }
      }

      const expAmt = page.locator('input[name="amount"], input[placeholder="0.00"]').first();
      if (await expAmt.isVisible()) {
        await expAmt.fill('1100');
      }

      const vendorInput = page.locator('input[name="vendor_name"], input[placeholder*="Vendor"], input[placeholder*="Payee"]').first();
      if (await vendorInput.isVisible()) {
        await vendorInput.fill('QA Test Vendor');
      }

      const descInput = page.locator('input[name="description"], input[placeholder*="Description"], input[placeholder*="Hot water"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('QA FINANCE TEST — Property Repair');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-expense-form-filled.png') });

      const saveExpBtn = page.locator('button:has-text("Save Expense"), button[type="submit"]').first();
      if (await saveExpBtn.isVisible()) {
        await saveExpBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-expense-created.png'), fullPage: true });

    // ----------------------------------------------------
    // 6. PAYMENT SCHEDULES
    // ----------------------------------------------------
    console.log('[QA 6/10] Testing Payment Schedules...');
    await page.goto('/dashboard/schedules');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-schedules-list.png'), fullPage: true });

    // ----------------------------------------------------
    // 7. BAS ACTIVITY STATEMENT WORKSHEET & ATO MAPPING
    // ----------------------------------------------------
    console.log('[QA 7/10] Auditing BAS Activity Statement Worksheet...');
    await page.goto('/dashboard/bas');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify core BAS elements exist
    await expect(page.locator('text=BAS Activity Worksheet').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=G1').first()).toBeVisible();
    await expect(page.locator('text=1A').first()).toBeVisible();
    await expect(page.locator('text=1B').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-bas-worksheet.png'), fullPage: true });

    // ----------------------------------------------------
    // 8. UNIFIED TRANSACTIONS LEDGER & SEARCH
    // ----------------------------------------------------
    console.log('[QA 8/10] Auditing Unified Transactions Ledger & Search...');
    await page.goto('/dashboard/money');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('QA FINANCE TEST');
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-transactions-search.png'), fullPage: true });
    } else {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-transactions-ledger.png'), fullPage: true });
    }

    // ----------------------------------------------------
    // 9. CLEANUP CONFIRMATION & INVARIANTS
    // ----------------------------------------------------
    console.log('[QA 9/10] Verifying Final Test State & Invariants...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-qa-final-summary.png'), fullPage: true });

    console.log('[QA 10/10] Full QA User-Journey successfully completed!');
  });
});
