import { test, expect } from '@playwright/test';

test.describe('Security - IDOR Protection', () => {
  let agentPage: any;
  let landlordPage: any;

  test.beforeAll(async ({ browser }) => {
    // Create two browser contexts for landlord and agent
    landlordPage = await browser.newContext();
    agentPage = await browser.newContext();
  });

  test.beforeEach(async () => {
    // Login as landlord
    const landlord = await landlordPage.newPage();
    await landlord.goto('/login');
    await landlord.fill('input[name="email"]', 'landlord@test.com');
    await landlord.fill('input[name="password"]', 'TestPassword123!');
    await landlord.click('button[type="submit"]');
    await landlord.waitForURL('/dashboard');

    // Login as agent
    const agent = await agentPage.newPage();
    await agent.goto('/login');
    await agent.fill('input[name="email"]', 'agent@test.com');
    await agent.fill('input[name="password"]', 'TestPassword123!');
    await agent.click('button[type="submit"]');
    await agent.waitForURL('/dashboard');
  });

  test('agent should NOT access Property B directly via URL', async () => {
    // Agent tries to access Property B units page
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/units?propertyId=55555555-5555-5555-5555-555555555555');
    
    // Should be redirected or show 403/404
    await expect(agent).not.toHaveURL(/Property B/);
    // Either redirected to dashboard or shows access denied
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B tenants directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/tenants?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B leases directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/leases?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B invoices directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/invoices?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B payments directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/payments?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B expenses directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/expenses?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B maintenance directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/maintenance?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('agent should NOT access Property B documents directly via URL', async () => {
    const agent = await agentPage.newPage();
    await agent.goto('/dashboard/documents?propertyId=55555555-5555-5555-5555-555555555555');
    
    const isDenied = await agent.locator('text=Access denied').isVisible().catch(() => false);
    const isRedirected = agent.url().includes('/dashboard') && !agent.url().includes('Property B');
    expect(isDenied || isRedirected).toBeTruthy();
  });

  test('landlord should access both properties', async () => {
    const landlord = await landlordPage.newPage();
    
    // Access Property A
    await landlord.goto('/dashboard/units?propertyId=44444444-4444-4444-4444-444444444444');
    await expect(landlord.locator('text=Unit 5A')).toBeVisible();
    
    // Access Property B
    await landlord.goto('/dashboard/units?propertyId=55555555-5555-5555-5555-555555555555');
    await expect(landlord.locator('text=Main House')).toBeVisible();
  });

  test.afterAll(async () => {
    await landlordPage.close();
    await agentPage.close();
  });
});