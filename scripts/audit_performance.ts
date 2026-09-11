import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface RequestLog {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  sizeBytes: number;
  type: string;
}

interface PageMetric {
  pageName: string;
  url: string;
  firstUiMs: number;
  dataLoadedMs: number;
  interactiveMs: number;
  totalNavigationMs: number;
  requestCount: number;
  duplicateRequests: string[];
  totalPayloadKb: number;
  domNodeCount: number;
  jsHeapUsedMb?: number;
  errors: string[];
  warnings: string[];
}

interface InteractionMetric {
  interaction: string;
  page: string;
  durationMs: number;
  notes?: string;
}

async function runAudit() {
  console.log('=================================================================');
  console.log('  PROPERTYLEDGE — FULL SPEED & RESPONSIVENESS MEASUREMENT AUDIT');
  console.log('=================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--expose-gc']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const requests: RequestLog[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  const pendingRequests = new Map<string, { start: number; method: string; url: string; type: string }>();

  page.on('request', req => {
    const id = `${req.method()}_${req.url()}_${Date.now()}_${Math.random()}`;
    (req as any)._auditId = id;
    pendingRequests.set(id, {
      start: Date.now(),
      method: req.method(),
      url: req.url(),
      type: req.resourceType(),
    });
  });

  page.on('requestfinished', async req => {
    const id = (req as any)._auditId;
    const info = pendingRequests.get(id);
    if (!info) return;
    pendingRequests.delete(id);
    const durationMs = Date.now() - info.start;
    let sizeBytes = 0;
    let status = 200;
    try {
      const resp = await req.response();
      if (resp) {
        status = resp.status();
        const headers = resp.headers();
        sizeBytes = Number(headers['content-length'] || 0);
      }
    } catch {}

    requests.push({
      url: info.url,
      method: info.method,
      status,
      durationMs,
      sizeBytes,
      type: info.type,
    });
  });

  const pageMetrics: PageMetric[] = [];
  const interactionMetrics: InteractionMetric[] = [];

  // Helper to measure navigation
  async function auditPageNavigation(
    pageName: string,
    targetUrlPattern: RegExp | string,
    navAction: () => Promise<any>,
    dataSelector: string
  ): Promise<PageMetric> {
    const initialRequestIndex = requests.length;
    const initialErrorsIndex = errors.length;
    const initialWarningsIndex = warnings.length;

    const navStart = Date.now();
    await navAction();

    // Wait for URL to update
    await page.waitForURL(targetUrlPattern, { timeout: 15000 }).catch(() => {});

    // First UI: main header, layout, or container visible
    await page.waitForSelector('header, nav, [data-testid="app-shell"], main, h1', { timeout: 15000 }).catch(() => {});
    const firstUiMs = Date.now() - navStart;

    // Data Loaded: data-specific element or table or card visible
    let dataLoadedMs = firstUiMs;
    try {
      await page.waitForSelector(dataSelector, { timeout: 20000 });
      dataLoadedMs = Date.now() - navStart;
    } catch {
      console.warn(`[${pageName}] Timeout waiting for dataSelector: ${dataSelector}`);
    }

    // Wait until network settles (max 1.5s idle)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const interactiveMs = Date.now() - navStart;
    const totalNavigationMs = interactiveMs;

    const pageRequests = requests.slice(initialRequestIndex);
    const requestUrls = pageRequests.map(r => r.url);
    const urlCounts: Record<string, number> = {};
    for (const u of requestUrls) {
      // simplify url for duplicate detection (strip timestamp query params if any)
      const cleanUrl = u.split('?')[0];
      urlCounts[cleanUrl] = (urlCounts[cleanUrl] || 0) + 1;
    }
    const duplicateRequests = Object.entries(urlCounts)
      .filter(([_, count]) => count > 1)
      .map(([u, c]) => `${u} (${c}x)`);

    const totalPayloadKb = Math.round(pageRequests.reduce((acc, r) => acc + r.sizeBytes, 0) / 1024);

    const domNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);

    let jsHeapUsedMb: number | undefined;
    try {
      jsHeapUsedMb = await page.evaluate(() => {
        return (window.performance as any)?.memory?.usedJSHeapSize
          ? Math.round((window.performance as any).memory.usedJSHeapSize / (1024 * 1024))
          : undefined;
      });
    } catch {}

    const metric: PageMetric = {
      pageName,
      url: page.url(),
      firstUiMs,
      dataLoadedMs,
      interactiveMs,
      totalNavigationMs,
      requestCount: pageRequests.length,
      duplicateRequests,
      totalPayloadKb,
      domNodeCount,
      jsHeapUsedMb,
      errors: errors.slice(initialErrorsIndex),
      warnings: warnings.slice(initialWarningsIndex),
    };

    pageMetrics.push(metric);
    console.log(`✓ [${pageName}] First UI: ${firstUiMs}ms | Data: ${dataLoadedMs}ms | Total: ${totalNavigationMs}ms | Requests: ${pageRequests.length} | DOM: ${domNodeCount} nodes`);
    return metric;
  }

  // -----------------------------------------------------------
  // STEP 1: LOGIN
  // -----------------------------------------------------------
  console.log('--- Step 1: Login ---');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'landlord@test.com');
  await page.fill('input[type="password"]', 'TestPassword123!');

  const loginStart = Date.now();
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 }).catch(async () => {
    console.log('Trying fallback login...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@propertyledge.com.au');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 20000 });
  });

  const loginDuration = Date.now() - loginStart;
  console.log(`✓ Logged in in ${loginDuration}ms. Landing URL: ${page.url()}`);

  // -----------------------------------------------------------
  // STEP 2: DASHBOARD
  // -----------------------------------------------------------
  console.log('\n--- Step 2: Dashboard Audit ---');
  await auditPageNavigation(
    'Dashboard (Initial Load)',
    /\/dashboard$/,
    async () => {
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    },
    'h1, .kpi-card, [data-testid="dashboard-kpis"], button, a[href*="/dashboard/properties"]'
  );

  // Measure button interaction on Dashboard (e.g. Quick Action or Property selector)
  const propSelector = page.locator('button:has-text("Properties"), a:has-text("Properties")').first();
  if (await propSelector.isVisible()) {
    const t0 = Date.now();
    await propSelector.hover();
    interactionMetrics.push({
      interaction: 'Hover Properties Link',
      page: 'Dashboard',
      durationMs: Date.now() - t0,
    });
  }

  // -----------------------------------------------------------
  // STEP 3: PROPERTIES
  // -----------------------------------------------------------
  console.log('\n--- Step 3: Properties Audit ---');
  await auditPageNavigation(
    'Properties Page',
    /\/dashboard\/properties/,
    async () => {
      // client-side navigate via link click if present, else goto
      const link = page.locator('a[href="/dashboard/properties"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto('http://localhost:3000/dashboard/properties', { waitUntil: 'domcontentloaded' });
      }
    },
    '.ag-root, [data-testid="properties-table"], [data-testid="property-card"], button:has-text("Add Property"), button:has-text("New Property")'
  );

  // Test Modal Open: Add Property
  const addPropBtn = page.locator('button:has-text("Add Property"), button:has-text("New Property"), button:has-text("Add")').first();
  if (await addPropBtn.isVisible()) {
    const t0 = Date.now();
    await addPropBtn.click();
    await page.waitForSelector('div[role="dialog"], .fixed, h2, h3:has-text("Property")', { timeout: 5000 }).catch(() => {});
    const modalMs = Date.now() - t0;
    interactionMetrics.push({
      interaction: 'Open Property Modal/Wizard',
      page: 'Properties',
      durationMs: modalMs,
    });
    console.log(`  Modal Open Time (Property): ${modalMs}ms`);
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // -----------------------------------------------------------
  // STEP 4: TENANTS
  // -----------------------------------------------------------
  console.log('\n--- Step 4: Tenants Audit ---');
  await auditPageNavigation(
    'Tenants Page',
    /\/dashboard\/(people|tenants)/,
    async () => {
      const link = page.locator('a[href="/dashboard/people"], a[href="/dashboard/tenants"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto('http://localhost:3000/dashboard/people', { waitUntil: 'domcontentloaded' });
      }
    },
    '.ag-root, [data-testid="tenant-grid"], [data-testid="admin-data-grid"], button:has-text("Add Tenant"), button:has-text("New Tenant")'
  );

  // Test Search/Filter on Tenants
  const tenantSearch = page.locator('input[placeholder*="Search"]').first();
  if (await tenantSearch.isVisible()) {
    const t0 = Date.now();
    await tenantSearch.fill('John');
    await tenantSearch.press('Enter').catch(() => {});
    await page.waitForTimeout(200);
    const searchMs = Date.now() - t0;
    interactionMetrics.push({
      interaction: 'Search Input Interaction',
      page: 'Tenants',
      durationMs: searchMs,
    });
    console.log(`  Search filter reaction time (Tenants): ${searchMs}ms`);
    await tenantSearch.fill('');
  }

  // -----------------------------------------------------------
  // STEP 5: LEASES
  // -----------------------------------------------------------
  console.log('\n--- Step 5: Leases Audit ---');
  await auditPageNavigation(
    'Leases Page',
    /\/dashboard\/leases/,
    async () => {
      const link = page.locator('a[href="/dashboard/leases"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto('http://localhost:3000/dashboard/leases', { waitUntil: 'domcontentloaded' });
      }
    },
    '.ag-root, [data-testid="leases-table"], button:has-text("New Lease"), button:has-text("Create Lease")'
  );

  // -----------------------------------------------------------
  // STEP 6: INVOICES
  // -----------------------------------------------------------
  console.log('\n--- Step 6: Invoices Audit ---');
  await auditPageNavigation(
    'Invoices Page',
    /\/dashboard\/invoices/,
    async () => {
      const link = page.locator('a[href="/dashboard/invoices"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto('http://localhost:3000/dashboard/invoices', { waitUntil: 'domcontentloaded' });
      }
    },
    '.ag-root, [data-testid="invoice-grid"], button:has-text("Create Invoice"), button:has-text("New Invoice")'
  );

  // Test Filter Pill Click (Invoices)
  const draftFilter = page.locator('button:has-text("Draft"), span:has-text("Draft")').first();
  if (await draftFilter.isVisible()) {
    const t0 = Date.now();
    await draftFilter.click();
    await page.waitForTimeout(100);
    const filterMs = Date.now() - t0;
    interactionMetrics.push({
      interaction: 'Quick Filter Click (Draft)',
      page: 'Invoices',
      durationMs: filterMs,
    });
    console.log(`  Status Filter Reaction Time: ${filterMs}ms`);
  }

  // Test Modal Open: Create Invoice
  const createInvBtn = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")').first();
  if (await createInvBtn.isVisible()) {
    const t0 = Date.now();
    await createInvBtn.click();
    await page.waitForSelector('div[role="dialog"], .fixed, h2:has-text("Invoice"), h3:has-text("Invoice")', { timeout: 8000 }).catch(() => {});
    const modalMs = Date.now() - t0;
    interactionMetrics.push({
      interaction: 'Open Create Invoice Modal',
      page: 'Invoices',
      durationMs: modalMs,
    });
    console.log(`  Modal Open Time (Create Invoice): ${modalMs}ms`);
    // Close modal
    const closeBtn = page.locator('div.fixed.inset-0 button:has(svg.lucide-x)').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // -----------------------------------------------------------
  // STEP 7: AUTOMATIONS
  // -----------------------------------------------------------
  console.log('\n--- Step 7: Automations Audit ---');
  await auditPageNavigation(
    'Automations Page',
    /\/dashboard\/automations/,
    async () => {
      const link = page.locator('a[href="/dashboard/automations"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto('http://localhost:3000/dashboard/automations', { waitUntil: 'domcontentloaded' });
      }
    },
    'h1, button:has-text("New Automation"), button:has-text("Create"), [data-testid="automation-card"]'
  );

  // -----------------------------------------------------------
  // STEP 8: SETTINGS & TAB SWITCHING
  // -----------------------------------------------------------
  console.log('\n--- Step 8: Settings & Tabs Audit ---');
  await auditPageNavigation(
    'Settings Page',
    /\/dashboard\/settings/,
    async () => {
      const link = page.locator('a[href="/dashboard/settings"]').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'domcontentloaded' });
      }
    },
    'h1, [role="tablist"], button:has-text("General"), button:has-text("Workspace"), button:has-text("Billing")'
  );

  // Test Tab Switching in Settings
  const billingTab = page.locator('button:has-text("Billing"), button:has-text("Subscription"), [role="tab"]:has-text("Billing")').first();
  if (await billingTab.isVisible()) {
    const t0 = Date.now();
    await billingTab.click();
    await page.waitForTimeout(100);
    const tabMs = Date.now() - t0;
    interactionMetrics.push({
      interaction: 'Tab Switch (Billing)',
      page: 'Settings',
      durationMs: tabMs,
    });
    console.log(`  Tab Switch Time (Billing): ${tabMs}ms`);
  }

  // -----------------------------------------------------------
  // STEP 9: REPEATED NAVIGATION LOOP (WARM CACHE / MEMORY LEAK AUDIT)
  // -----------------------------------------------------------
  console.log('\n--- Step 9: Repeated Navigation Stress Test (3 Cycles) ---');
  const loopRoutes = [
    { name: 'Dashboard', path: '/dashboard', selector: 'h1, a[href*="/dashboard/properties"]' },
    { name: 'Properties', path: '/dashboard/properties', selector: '.ag-root, button:has-text("Add Property")' },
    { name: 'Tenants', path: '/dashboard/people', selector: '.ag-root, button:has-text("Add Tenant")' },
    { name: 'Leases', path: '/dashboard/leases', selector: '.ag-root, button:has-text("New Lease")' },
    { name: 'Invoices', path: '/dashboard/invoices', selector: '.ag-root, button:has-text("Create Invoice")' },
    { name: 'Automations', path: '/dashboard/automations', selector: 'h1, button:has-text("New Automation")' },
  ];

  const warmTimings: Record<string, number[]> = {};

  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`  > Navigation Cycle ${cycle}/3...`);
    for (const r of loopRoutes) {
      const t0 = Date.now();
      const link = page.locator(`a[href="${r.path}"]`).first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await page.goto(`http://localhost:3000${r.path}`);
      }
      await page.waitForSelector(r.selector, { timeout: 15000 }).catch(() => {});
      const duration = Date.now() - t0;
      if (!warmTimings[r.name]) warmTimings[r.name] = [];
      warmTimings[r.name].push(duration);
    }
  }

  const finalDomCount = await page.evaluate(() => document.querySelectorAll('*').length);
  let finalHeapMb: number | undefined;
  try {
    finalHeapMb = await page.evaluate(() => {
      return (window.performance as any)?.memory?.usedJSHeapSize
        ? Math.round((window.performance as any).memory.usedJSHeapSize / (1024 * 1024))
        : undefined;
    });
  } catch {}

  console.log(`\nFinal DOM Node Count after loop: ${finalDomCount}`);
  if (finalHeapMb) console.log(`Final JS Heap Used: ${finalHeapMb} MB`);

  // Analyze network requests
  console.log('\n--- Network Request Breakdown ---');
  console.log(`Total Requests Recorded: ${requests.length}`);
  const requestsByDomain: Record<string, number> = {};
  const requestsByMethod: Record<string, number> = {};
  const slowRequests: RequestLog[] = [];

  for (const r of requests) {
    try {
      const host = new URL(r.url).host;
      requestsByDomain[host] = (requestsByDomain[host] || 0) + 1;
    } catch {}
    requestsByMethod[r.method] = (requestsByMethod[r.method] || 0) + 1;
    if (r.durationMs > 1000) {
      slowRequests.push(r);
    }
  }

  console.log('Requests by host:', JSON.stringify(requestsByDomain, null, 2));
  console.log('Requests by method:', JSON.stringify(requestsByMethod, null, 2));
  console.log(`Slow Requests (>1s): ${slowRequests.length}`);
  slowRequests.slice(0, 10).forEach(sr => {
    console.log(`  - [${sr.method}] ${sr.url} (${sr.durationMs}ms, ${Math.round(sr.sizeBytes / 1024)}KB)`);
  });

  // Save audit results to JSON
  const auditReport = {
    timestamp: new Date().toISOString(),
    pageMetrics,
    interactionMetrics,
    warmTimings,
    memoryStats: {
      finalDomCount,
      finalHeapMb,
    },
    totalRequests: requests.length,
    requestsByDomain,
    slowRequests: slowRequests.map(r => ({ url: r.url, method: r.method, durationMs: r.durationMs, sizeBytes: r.sizeBytes })),
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)).slice(0, 20),
  };

  const outputPath = path.join(process.cwd(), 'audit_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(auditReport, null, 2));
  console.log(`\nAudit completed and results saved to: ${outputPath}`);

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
