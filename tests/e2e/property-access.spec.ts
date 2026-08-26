import { test, expect } from '@playwright/test';

test.describe('Property Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Login as landlord (Property A + Property B owner)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'landlord@test.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('landlord should see both Property A and Property B in selector', async ({ page }) => {
    // Check property selector shows both properties
    await page.click('[data-testid="property-selector"]');
    await expect(page.locator('text=Property A - Downtown Apartment')).toBeVisible();
    await expect(page.locator('text=Property B - Suburban House')).toBeVisible();
  });

  test('landlord should be able to switch between properties', async ({ page }) => {
    // Select Property A
    await page.click('[data-testid="property-selector"]');
    await page.click('text=Property A - Downtown Apartment');
    await expect(page.locator('[data-testid="current-property"]')).toContainText('Property A');
    
    // Switch to Property B
    await page.click('[data-testid="property-selector"]');
    await page.click('text=Property B - Suburban House');
    await expect(page.locator('[data-testid="current-property"]')).toContainText('Property B');
  });

  test('landlord should see Property A data when Property A is selected', async ({ page }) => {
    await page.click('[data-testid="property-selector"]');
    await page.click('text=Property A - Downtown Apartment');
    
    // Navigate to units page
    await page.goto('/dashboard/units');
    await expect(page.locator('text=Unit 5A')).toBeVisible();
    await expect(page.locator('text=Unit 5B')).toBeVisible();
  });

  test('landlord should see Property B data when Property B is selected', async ({ page }) => {
    await page.click('[data-testid="property-selector"]');
    await page.click('text=Property B - Suburban House');
    
    // Navigate to units page
    await page.goto('/dashboard/units');
    await expect(page.locator('text=Main House')).toBeVisible();
    await expect(page.locator('text=Granny Flat')).toBeVisible();
  });
});

test.describe('Agent Property Access', () => {
  test.beforeEach(async ({ page }) => {
    // Login as agent (only has access to Property A)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'agent@test.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('agent should only see Property A in selector', async ({ page }) => {
    await page.click('[data-testid="property-selector"]');
    await expect(page.locator('text=Property A - Downtown Apartment')).toBeVisible();
    await expect(page.locator('text=Property B - Suburban House')).not.toBeVisible();
  });

  test('agent should see Property A data', async ({ page }) => {
    await page.goto('/dashboard/units');
    await expect(page.locator('text=Unit 5A')).toBeVisible();
    await expect(page.locator('text=Unit 5B')).toBeVisible();
  });
});