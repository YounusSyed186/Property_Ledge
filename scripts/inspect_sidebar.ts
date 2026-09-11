import { chromium } from '@playwright/test';

async function inspectSidebar() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'landlord@test.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  console.log('Current Page URL after login:', page.url());
  console.log('Page Title:', await page.title());
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML snippet:', bodyHtml.slice(0, 1000));

  await browser.close();
}

inspectSidebar().catch(console.error);
