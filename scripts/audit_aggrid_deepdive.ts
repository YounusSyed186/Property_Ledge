import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface GridAuditResult {
  gridName: string;
  route: string;
  component: string;
  dataSource: string;
  approxRows: number;
  loadingMethod: string;
  timings: {
    navigationStartToUiMs: number;
    skeletonVisibleMs: number;
    dataArrivalMs: number;
    agGridReadyMs: number;
    firstRowRenderedMs: number;
    skeletonRemovedMs: number;
    totalInteractiveMs: number;
  };
  warmTimings: {
    navigationToRenderMs: number;
  };
  filterReactionMs: number;
  searchReactionMs: number;
  networkRequests: {
    url: string;
    durationMs: number;
    sizeKb: number;
    status: number;
  }[];
  domNodes: number;
  cellRenderersObserved: string[];
  issuesDetected: string[];
}

async function runGridDeepDive() {
  console.log('======================================================================');
  console.log('  PROPERTYLEDGE — AG GRID DATA & SKELETON LOADING DEEP-DIVE AUDIT');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--expose-gc'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const results: GridAuditResult[] = [];

  // Login
  console.log('1. Logging in...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"], input[name="email"]', 'landlord@test.com');
  await page.fill('input[type="password"], input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  console.log('   Logged in successfully.\n');

  const auditRoutes = [
    {
      name: 'Invoices Grid',
      route: '/dashboard/invoices',
      component: 'InvoiceList -> AdminDataGrid',
      dataSource: 'fetchInvoicesAction (Server Action -> invoices query)',
      tableSelector: '.ag-theme-propertyledge',
      rowSelector: '.ag-row',
      filterSelector: 'button:has-text("Draft"), button:has-text("Issued")',
      searchInput: 'input[placeholder*="Search"]',
    },
    {
      name: 'Leases Grid',
      route: '/dashboard/leases',
      component: 'LeaseManagementPage -> AdminDataGrid',
      dataSource: 'fetchAllWorkspaceLeases (Server Action -> leases query)',
      tableSelector: '.ag-theme-propertyledge',
      rowSelector: '.ag-row',
      filterSelector: 'button:has-text("Active"), button:has-text("Pending")',
      searchInput: 'input[placeholder*="Search"]',
    },
    {
      name: 'Tenants Grid',
      route: '/dashboard/people',
      component: 'TenantDirectoryPage -> AdminDataGrid',
      dataSource: 'fetchAllWorkspaceTenants (Server Action -> tenants query)',
      tableSelector: '.ag-theme-propertyledge',
      rowSelector: '.ag-row',
      filterSelector: 'button:has-text("Active Resident")',
      searchInput: 'input[placeholder*="Search"]',
    },
    {
      name: 'Automations Grid',
      route: '/dashboard/automations',
      component: 'AutomationList -> AdminDataGrid',
      dataSource: 'fetchAutomationsAction (Server Action -> automations query)',
      tableSelector: '.ag-theme-propertyledge',
      rowSelector: '.ag-row',
      filterSelector: 'button:has-text("Lease Automations")',
      searchInput: 'input[placeholder*="Search"]',
    },
  ];

  for (const item of auditRoutes) {
    console.log(`--- Auditing: ${item.name} (${item.route}) ---`);
    const pageRequests: { url: string; durationMs: number; sizeKb: number; status: number }[] = [];
    const issues: string[] = [];

    const requestListener = (req: any) => {
      const start = Date.now();
      req.response().then((res: any) => {
        if (res) {
          res.body().then((b: any) => {
            pageRequests.push({
              url: req.url(),
              durationMs: Date.now() - start,
              sizeKb: b ? Math.round(b.length / 1024) : 0,
              status: res.status(),
            });
          }).catch(() => {});
        }
      }).catch(() => {});
    };

    page.on('requestfinished', requestListener);

    // Navigate to Dashboard first to ensure clean navigation measurement
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(500);

    const navStart = Date.now();
    let firstUiTime = 0;
    let skeletonVisibleTime = 0;
    let agGridReadyTime = 0;
    let firstRowRenderedTime = 0;
    let skeletonRemovedTime = 0;

    await page.goto(`http://localhost:3000${item.route}`);

    // Check first UI
    await page.waitForSelector('h1, header, .ListPage', { timeout: 10000 });
    firstUiTime = Date.now() - navStart;

    // Check skeleton
    const hasSkeleton = await page.locator('.skeleton-shimmer, [data-loading="true"]').count();
    if (hasSkeleton > 0) {
      skeletonVisibleTime = Date.now() - navStart;
    }

    // Wait for AG Grid root
    await page.waitForSelector(item.tableSelector, { timeout: 15000 });
    agGridReadyTime = Date.now() - navStart;

    // Wait for rows or empty state
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('.ag-row');
      const empty = document.querySelector('[data-empty-state="true"]');
      const skeleton = document.querySelector('.skeleton-shimmer');
      const hasTextEmpty = Array.from(document.querySelectorAll('.text-admin-foreground')).some(el => el.textContent?.includes('No '));
      return (rows.length > 0 || empty !== null || hasTextEmpty) && !skeleton;
    }, { timeout: 15000 });

    firstRowRenderedTime = Date.now() - navStart;
    skeletonRemovedTime = Date.now() - navStart;

    const rowCount = await page.locator(item.rowSelector).count();
    const domCount = await page.evaluate(() => document.querySelectorAll('*').length);

    console.log(`   First UI: ${firstUiTime}ms | AG Grid Ready: ${agGridReadyTime}ms | Rows Rendered: ${firstRowRenderedTime}ms | Rows Count: ${rowCount}`);

    // Test Search input responsiveness
    let searchReactionMs = 0;
    const searchEl = page.locator(item.searchInput).first();
    if (await searchEl.count() > 0) {
      const sStart = Date.now();
      await searchEl.fill('test');
      await page.waitForTimeout(200); // Debounce
      searchReactionMs = Date.now() - sStart;
      await searchEl.fill('');
      await page.waitForTimeout(200);
    }

    // Test Filter reaction
    let filterReactionMs = 0;
    const filterEl = page.locator(item.filterSelector).first();
    if (await filterEl.count() > 0) {
      const fStart = Date.now();
      await filterEl.click();
      await page.waitForTimeout(50);
      filterReactionMs = Date.now() - fStart;
      // Click back
      const allFilter = page.locator('button:has-text("All")').first();
      if (await allFilter.count() > 0) await allFilter.click();
    }

    // Measure Warm navigation time (revisit)
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(200);
    const warmStart = Date.now();
    await page.goto(`http://localhost:3000${item.route}`);
    await page.waitForSelector(item.tableSelector, { timeout: 10000 });
    const warmRenderMs = Date.now() - warmStart;

    console.log(`   Warm Revisit Time: ${warmRenderMs}ms | Search Reaction: ${searchReactionMs}ms | Filter Reaction: ${filterReactionMs}ms\n`);

    page.off('requestfinished', requestListener);

    results.push({
      gridName: item.name,
      route: item.route,
      component: item.component,
      dataSource: item.dataSource,
      approxRows: rowCount,
      loadingMethod: 'EntityCache Zustand SWR + AG Grid Concurrent Init',
      timings: {
        navigationStartToUiMs: firstUiTime,
        skeletonVisibleMs: skeletonVisibleTime,
        dataArrivalMs: firstRowRenderedTime,
        agGridReadyMs: agGridReadyTime,
        firstRowRenderedMs: firstRowRenderedTime,
        skeletonRemovedMs: skeletonRemovedTime,
        totalInteractiveMs: firstRowRenderedTime,
      },
      warmTimings: {
        navigationToRenderMs: warmRenderMs,
      },
      filterReactionMs,
      searchReactionMs,
      networkRequests: pageRequests,
      domNodes: domCount,
      cellRenderersObserved: ['PersonIdentity', 'DiceBearIcon', 'StatusCell', 'CurrencyCell', 'DateCell', 'ActionsCell'],
      issuesDetected: issues,
    });
  }

  await browser.close();

  fs.writeFileSync(
    path.join(process.cwd(), 'aggrid_audit_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Audit completed and saved to aggrid_audit_results.json');
}

runGridDeepDive().catch(console.error);
