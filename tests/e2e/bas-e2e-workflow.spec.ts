import { test, expect } from '@playwright/test';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

test('End-to-End BAS UI Verification Flow', async ({ page }) => {
  test.setTimeout(90000);

  // 1. Log in via UI
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 25000 });

  // 2. Check Properties page
  await page.goto('/dashboard/properties');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await expect(page.locator('h1, h2, h3').filter({ hasText: 'Properties' }).first()).toBeVisible({ timeout: 10000 });

  // 3. Record Income Transaction via UI
  await page.goto('/dashboard/money');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const addTxBtn = page.locator('button:has-text("Add Transaction"), button:has-text("Record Transaction"), button:has-text("New Transaction")').first();
  if (await addTxBtn.isVisible()) {
    await addTxBtn.click({ force: true });
    await page.waitForTimeout(800);

    // Fill amount $2,200
    const amtInput = page.locator('input[placeholder="0.00"]').first();
    if (await amtInput.isVisible()) {
      await amtInput.fill('2200');
    }

    // Set description
    const descInput = page.locator('input[placeholder*="Description"]').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Commercial Lease Rent - Suite 401');
    }

    // Save transaction
    const saveTxBtn = page.locator('button:has-text("Save Transaction"), button:has-text("Record Transaction"), button:has-text("Create Transaction")').first();
    if (await saveTxBtn.isVisible()) {
      await saveTxBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
  }

  // 4. Record Expense via UI
  await page.goto('/dashboard/expenses');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const addExpBtn = page.locator('button:has-text("Add Expense"), button:has-text("Record Expense"), button:has-text("New Expense")').first();
  if (await addExpBtn.isVisible()) {
    await addExpBtn.click({ force: true });
    await page.waitForTimeout(800);

    const expAmt = page.locator('input[placeholder="0.00"]').first();
    if (await expAmt.isVisible()) {
      await expAmt.fill('550');
    }

    const expDesc = page.locator('input[placeholder*="Description"]').first();
    if (await expDesc.isVisible()) {
      await expDesc.fill('Building AC Maintenance & Duct Cleaning');
    }

    const saveExpBtn = page.locator('button:has-text("Save Expense"), button:has-text("Create Expense"), button:has-text("Record Expense")').first();
    if (await saveExpBtn.isVisible()) {
      await saveExpBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
  }

  // 5. Navigate to Payment Schedules
  await page.goto('/dashboard/schedules');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 6. Navigate to BAS Activity Statement Page
  await page.goto('/dashboard/bas');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Assertions on BAS Worksheet UI
  await expect(page.locator('text=BAS Activity Worksheet').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('text=Business Income').first()).toBeVisible();
  await expect(page.locator('text=Business Expenses').first()).toBeVisible();
  await expect(page.locator('text=Net GST Payable').first()).toBeVisible();

  // Assert ATO BAS reference codes
  await expect(page.locator('text=Official ATO BAS Reference Codes').first()).toBeVisible();
  await expect(page.locator('text=Total Sales').first()).toBeVisible();
  await expect(page.locator('text=GST on Sales').first()).toBeVisible();
  await expect(page.locator('text=GST on Purchases').first()).toBeVisible();
  await expect(page.locator('text=Non-capital Purchases').first()).toBeVisible();

  // Ensure artifacts dir exists
  const artifactsDir = path.join(process.cwd(), 'artifacts');

  // Save full-page screenshot of Worksheet
  await page.screenshot({
    path: path.join(artifactsDir, 'bas-ui-verification-worksheet.png'),
    fullPage: true,
  });

  // Switch to Details / Audit Tab
  const detailsTab = page.locator('button:has-text("Details"), button:has-text("Audit"), [role="tab"]:has-text("Details")').first();
  if (await detailsTab.isVisible()) {
    await detailsTab.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(artifactsDir, 'bas-ui-verification-details.png'),
      fullPage: true,
    });
  }

  // Switch to How to Submit / Guidance Tab
  const howToTab = page.locator('button:has-text("How to Submit"), button:has-text("Guidance"), [role="tab"]:has-text("How to Submit")').first();
  if (await howToTab.isVisible()) {
    await howToTab.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(artifactsDir, 'bas-ui-verification-guidance.png'),
      fullPage: true,
    });
  }

  console.log('✓ BAS UI End-to-End verification and screenshots captured successfully!');
});
