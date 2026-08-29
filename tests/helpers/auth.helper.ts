import { Page, expect } from '@playwright/test';
import { TEST_USERS } from '../config/test-env';

export async function loginAs(page: Page, userType: 'admin' | 'landlord' | 'agent' | 'platformAdmin') {
  await page.context().clearCookies();
  const credentials = TEST_USERS[userType];
  await page.goto('/login');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login');
}
