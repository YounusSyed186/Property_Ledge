import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { PropertyWizardPage } from '../pages/PropertyWizardPage';

test.describe('P0 — Property Creation Wizard & CRUD Operations', () => {
  let wizard: PropertyWizardPage;

  test.beforeEach(async ({ page }) => {
    wizard = new PropertyWizardPage(page);
  });

  test('06.1: Landlord views properties list with 123 Main Street and 456 Oak Avenue', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await expect(page.locator('text=123 Main Street')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=456 Oak Avenue')).toBeVisible({ timeout: 15000 });
  });

  test('06.2: Open Create Property Wizard modal', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await page.click('button:has-text("Add Property"), button:has-text("Create Property")');
    await expect(page.locator('text=Property Location').first()).toBeVisible({ timeout: 10000 });
  });

  test('06.3: Validation failure on Step 1 when mandatory fields are missing', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await page.click('button:has-text("Add Property"), button:has-text("Create Property")');
    
    await wizard.next();
    await expect(page.locator('text=Validation Failed').first()).toBeVisible({ timeout: 5000 });
  });

  test('06.4: Complete full 4-step Property Creation Wizard flow', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard/properties');
    await page.click('button:has-text("Add Property"), button:has-text("Create Property")');

    const testAddress = `789 Automated Test St ${Date.now()}`;

    // Step 0: Location
    await wizard.fillStep1Location(testAddress, 'Surry Hills', '2010', 'NSW', 'House');
    await wizard.next();

    // Step 1: Features & Rent
    await wizard.fillStep2Features('3', '2', '1', '850');
    await wizard.next();

    // Step 2: Image
    await wizard.next();

    // Step 3: Final Review & Submission
    await expect(page.locator(`text=${testAddress}`).first()).toBeVisible();
    await wizard.submit();

    // Verify property appears in list
    await expect(page.locator(`text=${testAddress}`).first()).toBeVisible({ timeout: 15000 });
  });
});
