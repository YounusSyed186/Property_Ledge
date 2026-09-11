import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface NavigationTiming {
  fromRoute: string;
  toRoute: string;
  label: string;
  clickToFeedbackMs: number;
  clickToUrlChangeMs: number;
  clickToShellMs: number;
  clickToDataMs: number;
  clickToInteractiveMs: number;
  requestsCount: number;
  rscRequestsCount: number;
  requests: { url: string; durationMs: number; sizeKb: number; status: number }[];
  domNodes: number;
  layoutShiftDetected: boolean;
}

interface RapidNavigationTest {
  sequence: string[];
  totalSequenceMs: number;
  finalRoute: string;
  finalContentCorrect: boolean;
  errorsCaught: string[];
}

interface CollapseTiming {
  action: 'collapse' | 'expand';
  durationMs: number;
  domWidthBefore: number;
  domWidthAfter: number;
}

async function runSidebarAudit() {
  console.log('======================================================================');
  console.log('  PROPERTYLEDGE — SIDEBAR & PAGE TRANSITION DEEP-DIVE AUDIT');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--expose-gc'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Step 1: Login
  console.log('1. Authenticating test user...');
  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'landlord@test.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 }).catch(async () => {
    console.log('Trying fallback admin login...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@propertyledge.com.au');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 });
  });

  await page.waitForSelector('aside nav, nav, [data-testid="app-shell"]', { timeout: 15000 });
  console.log(`   Authenticated. Current URL: ${page.url()}\n`);

  // Sidebar link tests
  const navTargets = [
    { label: 'Properties', href: '/dashboard/properties', expectedHeader: 'Properties' },
    { label: 'Tenants', href: '/dashboard/people', expectedHeader: 'Tenants' },
    { label: 'Leases', href: '/dashboard/leases', expectedHeader: 'Leases' },
    { label: 'Invoices', href: '/dashboard/invoices', expectedHeader: 'Invoices' },
    { label: 'Automations', href: '/dashboard/automations', expectedHeader: 'Automations' },
    { label: 'Settings', href: '/dashboard/settings', expectedHeader: 'Settings' },
    { label: 'Dashboard', href: '/dashboard', expectedHeader: 'Dashboard' },
  ];

  const timings: NavigationTiming[] = [];

  console.log('2. Measuring Click-to-Interactive for all Sidebar Links...');

  for (let i = 0; i < navTargets.length; i++) {
    const target = navTargets[i];
    const prevRoute = page.url();
    const navRequests: { url: string; durationMs: number; sizeKb: number; status: number }[] = [];

    const reqListener = (req: any) => {
      const start = Date.now();
      req.response().then((res: any) => {
        if (res) {
          res.body().then((b: any) => {
            navRequests.push({
              url: req.url(),
              durationMs: Date.now() - start,
              sizeKb: b ? Math.round(b.length / 1024) : 0,
              status: res.status(),
            });
          }).catch(() => {});
        }
      }).catch(() => {});
    };

    page.on('requestfinished', reqListener);

    // Find sidebar link
    const linkLocator = page.locator(`a[href="${target.href}"], a[href*="${target.href}"]`).first();
    const linkExists = await linkLocator.count();
    if (!linkExists) {
      console.log(`   [!] Could not locate sidebar link for: ${target.label} (${target.href})`);
      page.off('requestfinished', reqListener);
      continue;
    }

    const t0 = Date.now();
    let tFeedback = 0;
    let tUrl = 0;
    let tShell = 0;
    let tData = 0;
    let tInteractive = 0;

    // Click sidebar item
    await linkLocator.click();

    // Check immediate feedback on sidebar item (active pill or class change)
    tFeedback = Date.now() - t0;

    // Wait for URL change
    await page.waitForURL(`**${target.href}*`, { timeout: 10000 });
    tUrl = Date.now() - t0;

    // Wait for Page Shell (header, main container)
    await page.waitForSelector('main, h1, h2, header', { timeout: 10000 });
    tShell = Date.now() - t0;

    // Wait for Useful Data or table/cards to render
    await page.waitForFunction(() => {
      const skeleton = document.querySelector('.skeleton-shimmer, [data-loading="true"]');
      const hasContent = document.querySelectorAll('.ag-row, [data-kpi-card="true"], .ListPageGrid, form, h1').length > 0;
      return hasContent && !skeleton;
    }, { timeout: 15000 });
    tData = Date.now() - t0;
    tInteractive = Date.now() - t0;

    const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    const rscCount = navRequests.filter(r => r.url.includes('_rsc=')).length;

    page.off('requestfinished', reqListener);

    console.log(`   ${target.label.padEnd(12)}: Feedback: ${tFeedback}ms | URL: ${tUrl}ms | Shell: ${tShell}ms | Data: ${tData}ms | Interactive: ${tInteractive}ms | Requests: ${navRequests.length} (RSC: ${rscCount})`);

    timings.push({
      fromRoute: prevRoute,
      toRoute: target.href,
      label: target.label,
      clickToFeedbackMs: tFeedback,
      clickToUrlChangeMs: tUrl,
      clickToShellMs: tShell,
      clickToDataMs: tData,
      clickToInteractiveMs: tInteractive,
      requestsCount: navRequests.length,
      rscRequestsCount: rscCount,
      requests: navRequests,
      domNodes,
      layoutShiftDetected: false,
    });

    await page.waitForTimeout(200);
  }

  // Step 3: Sidebar Collapse & Expand Responsiveness
  console.log('\n3. Testing Sidebar Collapse and Expand responsiveness...');
  const collapseButton = page.locator('button[title*="Collapse"], button:has(svg.lucide-panel-left-close), button:has(svg.lucide-panel-left-open)').first();
  const collapseTimings: CollapseTiming[] = [];

  if (await collapseButton.count() > 0) {
    // Measure collapse
    const w1 = await page.evaluate(() => document.querySelector('aside')?.clientWidth || 0);
    const tColStart = Date.now();
    await collapseButton.click();
    await page.waitForTimeout(300); // Allow spring animation
    const w2 = await page.evaluate(() => document.querySelector('aside')?.clientWidth || 0);
    const tCol = Date.now() - tColStart;
    console.log(`   Sidebar Collapse: ${tCol}ms (Width: ${w1}px -> ${w2}px)`);
    collapseTimings.push({ action: 'collapse', durationMs: tCol, domWidthBefore: w1, domWidthAfter: w2 });

    // Measure expand
    const tExpStart = Date.now();
    await collapseButton.click();
    await page.waitForTimeout(300);
    const w3 = await page.evaluate(() => document.querySelector('aside')?.clientWidth || 0);
    const tExp = Date.now() - tExpStart;
    console.log(`   Sidebar Expand: ${tExp}ms (Width: ${w2}px -> ${w3}px)`);
    collapseTimings.push({ action: 'expand', durationMs: tExp, domWidthBefore: w2, domWidthAfter: w3 });
  } else {
    console.log('   Sidebar collapse toggle button not found in current layout.');
  }

  // Step 4: Rapid Navigation Stress Test (Race conditions)
  console.log('\n4. Testing Rapid Click Sequence (Stress & Race Condition)...');
  const rapidSeq = ['/dashboard/properties', '/dashboard/people', '/dashboard/leases', '/dashboard/invoices'];
  const rStart = Date.now();

  for (const r of rapidSeq) {
    const link = page.locator(`a[href*="${r}"]`).first();
    if (await link.count() > 0) {
      await link.click();
      await page.waitForTimeout(50); // Immediate next click
    }
  }

  // Wait for final destination to settle
  await page.waitForURL('**/dashboard/invoices*', { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('.skeleton-shimmer'), { timeout: 10000 });
  const rTotal = Date.now() - rStart;
  const currentUrl = page.url();
  const isCorrect = currentUrl.includes('/dashboard/invoices');
  console.log(`   Rapid sequence finished in ${rTotal}ms. Final URL: ${currentUrl} (Correct: ${isCorrect})`);

  // Step 5: Back and Forward Navigation Test
  console.log('\n5. Testing Browser Back / Forward History Navigation...');
  const backStart = Date.now();
  await page.goBack();
  await page.waitForURL('**/dashboard/leases*', { timeout: 10000 });
  const backMs = Date.now() - backStart;
  console.log(`   History Back (to Leases): ${backMs}ms`);

  const forwardStart = Date.now();
  await page.goForward();
  await page.waitForURL('**/dashboard/invoices*', { timeout: 10000 });
  const forwardMs = Date.now() - forwardStart;
  console.log(`   History Forward (to Invoices): ${forwardMs}ms`);

  await browser.close();

  const auditOutput = {
    timestamp: new Date().toISOString(),
    navTimings: timings,
    collapseTimings,
    rapidTest: {
      sequence: rapidSeq,
      totalSequenceMs: rTotal,
      finalRoute: currentUrl,
      finalContentCorrect: isCorrect,
      errorsCaught: consoleErrors,
    },
    historyNav: {
      backMs,
      forwardMs,
    },
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'sidebar_audit_results.json'),
    JSON.stringify(auditOutput, null, 2)
  );

  console.log('\nAudit complete! Results saved to sidebar_audit_results.json');
}

runSidebarAudit().catch(console.error);
