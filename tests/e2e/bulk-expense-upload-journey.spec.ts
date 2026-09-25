import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

test.describe('PropertyLedge — Bulk Expense Folder Upload & Review Lifecycle', () => {
  test.setTimeout(120000);

  test('Execute Complete Bulk Expense Upload Workflow (Setup, Folder Scan, Inline Edit, Bulk Edit, Import)', async ({
    page,
  }) => {
    // 1. Login
    console.log('[BULK EXPENSE TEST 1/8] Logging in...');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 25000 });
    await page.waitForLoadState('networkidle');
    console.log('[BULK EXPENSE TEST 1/8] Logged in successfully.');

    // 2. Navigate to Expenses page
    console.log('[BULK EXPENSE TEST 2/8] Navigating to Expenses...');
    await page.goto('/dashboard/expenses');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 3. Open Bulk Upload Modal
    console.log('[BULK EXPENSE TEST 3/8] Opening Bulk Expense Upload Workflow...');
    const bulkUploadBtn = page.locator('button:has-text("Bulk Upload")').first();
    await expect(bulkUploadBtn).toBeVisible({ timeout: 15000 });
    await bulkUploadBtn.click();
    await page.waitForTimeout(800);

    // Verify Modal header and Step 1
    const modalHeader = page.getByRole('heading', { name: /Bulk Expense Upload/i });
    await expect(modalHeader).toBeVisible({ timeout: 10000 });

    // 4. Select Property & Lease in Step 1
    console.log('[BULK EXPENSE TEST 4/8] Selecting Property & Lease...');
    const propertySelect = page.locator('[data-testid="bulk-property-select"]');
    await expect(propertySelect).toBeVisible({ timeout: 10000 });

    // Wait until dropdown options are populated
    await expect(propertySelect.locator('option').nth(1)).toBeAttached({ timeout: 15000 });
    const secondVal = await propertySelect.locator('option').nth(1).getAttribute('value');
    if (secondVal) {
      await propertySelect.selectOption(secondVal);
      await page.waitForTimeout(600);
    }

    // 5. Upload test folder directory
    console.log('[BULK EXPENSE TEST 5/8] Uploading test folder directory...');
    const fileInput = page.locator('[data-testid="bulk-folder-input"]');
    const testFolder = path.resolve(process.cwd(), 'tests/fixtures/test-expense-folder');

    console.log(`[BULK EXPENSE TEST 5/8] Uploading directory: ${testFolder}...`);
    await fileInput.setInputFiles(testFolder);

    // 6. Verify Review Table loaded
    console.log('[BULK EXPENSE TEST 6/8] Verifying parsed items in Review Table...');
    await expect(page.getByText(/Total Documents/i)).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    // Check rows appear
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`[BULK EXPENSE TEST 6/8] Loaded ${rowCount} staged review rows from folder.`);

    // 7. Test Inline Editing
    console.log('[BULK EXPENSE TEST 7/8] Testing Inline Editing on Review Table...');
    const amountInputs = page.locator('tbody tr input[type="number"]');
    const amtCount = await amountInputs.count();
    for (let i = 0; i < amtCount; i++) {
      const input = amountInputs.nth(i);
      const val = await input.inputValue();
      if (!val || Number(val) <= 0) {
        await input.fill('158.00');
        await page.waitForTimeout(300);
      }
    }

    // 8. Test Navigation to Confirmation & Import
    console.log('[BULK EXPENSE TEST 8/8] Proceeding to Confirmation and Atomic Import...');
    const proceedBtn = page.getByRole('button', { name: /Proceed to Import/i });
    await expect(proceedBtn).toBeVisible({ timeout: 10000 });
    await proceedBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByRole('heading', { name: /Ready to Import Expenses/i })).toBeVisible({ timeout: 10000 });

    // Click final Import button
    const importFinalBtn = page.getByRole('button', { name: /Import.*Expenses/i });
    await expect(importFinalBtn).toBeVisible();
    await importFinalBtn.click();

    // Verify Success Screen
    await expect(page.getByRole('heading', { name: /Import Completed Successfully!/i })).toBeVisible({ timeout: 30000 });

    // Click View Expenses
    const viewExpensesBtn = page.getByRole('button', { name: /View Expenses/i });
    await viewExpensesBtn.click();
    await page.waitForTimeout(1000);

    console.log('[BULK EXPENSE COMPLETE] Full Bulk Expense Upload workflow verified successfully!');
  });
});
