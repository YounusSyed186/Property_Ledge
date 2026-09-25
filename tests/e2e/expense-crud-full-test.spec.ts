import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

const SCREENSHOT_DIR = path.join(process.cwd(), 'artifacts', 'screenshots', 'expense-crud');

test.describe('PropertyLedge — Expense UI Full CRUD Testing Suite', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Complete Expense CRUD Lifecycle from UI', async ({ page }) => {
    test.setTimeout(180000);

    // ----------------------------------------------------
    // STEP 1: AUTHENTICATION & NAVIGATION
    // ----------------------------------------------------
    console.log('▶ [Step 1] Logging in as Landlord...');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-screen.png') });

    await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 25000 });
    await page.waitForLoadState('networkidle');

    console.log('▶ [Step 2] Navigating to Expenses View (/dashboard/expenses)...');
    await page.goto('/dashboard/expenses');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-expenses-initial-list.png'), fullPage: true });

    // Verify Expenses page loaded with transaction-backed architecture
    await expect(page.locator('h1, h2').filter({ hasText: /Expenses/i }).first()).toBeVisible();

    // ----------------------------------------------------
    // STEP 2: CREATE EXPENSE TRANSACTION
    // ----------------------------------------------------
    console.log('▶ [Step 3] CREATE: Opening Record Expense Modal...');
    const addExpenseBtn = page.locator('button:has-text("Record Expense"), button:has-text("Add Expense"), button:has-text("New Expense")').first();
    await expect(addExpenseBtn).toBeVisible();
    await addExpenseBtn.click();
    await page.waitForTimeout(1000);

    // Verify ExpenseModal is displayed
    const modalHeading = page.locator('h2, h3').filter({ hasText: /Operating Expense|Record Expense/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    // Wait for dropdown options to populate
    const propSelect = page.locator('select[name="propertyId"]').first();
    await expect(propSelect).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector('select[name="propertyId"]') as HTMLSelectElement;
      return el && el.options.length > 1;
    }, { timeout: 10000 });

    const propOpts = await propSelect.locator('option').all();
    if (propOpts.length > 1) {
      const val = await propOpts[1].getAttribute('value');
      if (val) await propSelect.selectOption(val);
    }

    // Select Category (Repairs & Maintenance)
    const catSelect = page.locator('select[name="categoryId"]').first();
    await expect(catSelect).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector('select[name="categoryId"]') as HTMLSelectElement;
      return el && el.options.length > 1;
    }, { timeout: 10000 });

    const catOpts = await catSelect.locator('option').all();
    let selectedCat = false;
    for (const opt of catOpts) {
      const txt = await opt.innerText();
      if (txt.toLowerCase().includes('repair') || txt.toLowerCase().includes('maintenance')) {
        const val = await opt.getAttribute('value');
        if (val) {
          await catSelect.selectOption(val);
          selectedCat = true;
          break;
        }
      }
    }
    if (!selectedCat && catOpts.length > 1) {
      const fallbackVal = await catOpts[1].getAttribute('value');
      if (fallbackVal) await catSelect.selectOption(fallbackVal);
    }

    // Select Tax Classification (Repair & Maintenance)
    const taxSelect = page.locator('select[aria-label="BAS Tax Classification"], select[name="taxClassificationId"]').first();
    if (await taxSelect.isVisible()) {
      const taxOpts = await taxSelect.locator('option').all();
      for (const opt of taxOpts) {
        const txt = await opt.innerText();
        if (txt.includes('Repair & Maintenance') || txt.includes('Repairs')) {
          const val = await opt.getAttribute('value');
          if (val) {
            await taxSelect.selectOption(val);
            break;
          }
        }
      }
    }

    // Fill Amount ($750)
    const amtInput = page.locator('input[name="amount"]').first();
    await expect(amtInput).toBeVisible();
    await amtInput.fill('750');

    // Fill Vendor
    const uniqueVendor = 'Sydney Express Plumbing';
    const vendorInput = page.locator('input[name="vendorName"]').first();
    if (await vendorInput.isVisible()) {
      await vendorInput.fill(uniqueVendor);
    }

    // Fill Description
    const uniqueId = Date.now().toString().slice(-4);
    const uniqueDesc = `Emergency Plumbing #${uniqueId}`;
    const descInput = page.locator('input[name="description"]').first();
    if (await descInput.isVisible()) {
      await descInput.fill(uniqueDesc);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-create-modal-filled.png') });

    // Submit Expense
    const submitBtn = page.locator('button[type="submit"]:has-text("Record Expense"), button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // ----------------------------------------------------
    // STEP 3: READ & VERIFY CREATED EXPENSE
    // ----------------------------------------------------
    console.log('▶ [Step 4] READ: Verifying Expense Appears in Table...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-expense-created-in-list.png'), fullPage: true });

    // Verify created expense exists in page text / table
    await expect(page.locator('body')).toContainText(uniqueVendor, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(`Emergency Plumbing #${uniqueId}`, { timeout: 15000 });
    console.log('✓ Successfully verified created expense in the table!');

    // ----------------------------------------------------
    // STEP 4: VIEW EXPENSE DETAILS DRAWER
    // ----------------------------------------------------
    console.log('▶ [Step 4] READ: Viewing Expense Detail Drawer...');
    const viewBtn = page.locator('button[title="View Details"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-expense-detail-modal.png') });
    }

    // ----------------------------------------------------
    // STEP 5: UPDATE EXPENSE TRANSACTION
    // ----------------------------------------------------
    console.log('▶ [Step 5] UPDATE: Editing Expense Transaction...');
    const drawerEditBtn = page.locator('button:has-text("Edit Expense")').first();
    if (await drawerEditBtn.isVisible()) {
      await drawerEditBtn.click();
    } else {
      const editBtn = page.locator('button[title="Edit Expense"]').first();
      await editBtn.click();
    }
    await page.waitForTimeout(1000);

    const updateAmtInput = page.locator('input[name="amount"]').first();
    await updateAmtInput.fill('850');

    const updateDescInput = page.locator('input[name="description"]').first();
    const updatedDesc = `Emergency Plumbing #${uniqueId} [UPDATED]`;
    await updateDescInput.fill(updatedDesc);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-expense-edit-modal.png') });

    const saveEditBtn = page.locator('button[type="submit"]:has-text("Save Changes"), button[type="submit"]').first();
    await saveEditBtn.click();
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toContainText('Expense Updated', { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-expense-updated-in-list.png'), fullPage: true });
    console.log('✓ Successfully updated expense transaction!');

    // ----------------------------------------------------
    // STEP 6: DELETE / REVERSE EXPENSE TRANSACTION
    // ----------------------------------------------------
    console.log('▶ [Step 6] DELETE: Deleting / Reversing Expense Transaction...');
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Can delete from open drawer or open the drawer again
    const drawerDeleteBtn = page.locator('button:has-text("Delete Expense")').first();
    const tableDeleteBtn = page.locator('button[title="Delete Expense"]').first();

    if (await drawerDeleteBtn.isVisible()) {
      await drawerDeleteBtn.click();
    } else if (await tableDeleteBtn.isVisible()) {
      await tableDeleteBtn.click();
    }
    
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toContainText('Expense Deleted', { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-expense-deleted.png'), fullPage: true });
    console.log('✓ Successfully executed delete on expense transaction!');

    console.log('▶ [Step 7] Complete Expense CRUD UI lifecycle successfully verified!');
  });
});
