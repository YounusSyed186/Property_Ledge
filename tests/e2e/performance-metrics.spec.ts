import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Performance Metrics Audit (Vercel & Next.js 15 Profile)', () => {
  test('01. Public Route Timing & Core Web Vitals (/login)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'load' });

    // Capture Navigation Timing (TTFB, DOMContentLoaded, Load)
    const navTiming = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (!entry) return null;
      return {
        ttfb: Math.round(entry.responseStart - entry.requestStart),
        domContentLoaded: Math.round(entry.domContentLoadedEventEnd - entry.fetchStart),
        loadComplete: Math.round(entry.loadEventEnd - entry.fetchStart),
        transferSize: entry.transferSize,
      };
    });

    console.log('[PERF_AUDIT] /login Navigation Timing:', navTiming);
    expect(navTiming).not.toBeNull();
    if (navTiming) {
      expect(navTiming.ttfb).toBeLessThan(1500);
    }

    // Capture Paint Timings (FP & FCP)
    const paintTimings = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const result: Record<string, number> = {};
      entries.forEach((e) => {
        result[e.name] = Math.round(e.startTime);
      });
      return result;
    });
    console.log('[PERF_AUDIT] /login Paint Timings:', paintTimings);
    expect(paintTimings['first-contentful-paint']).toBeDefined();
  });

  test('02. Authenticated Dashboard LCP & TBT (/dashboard)', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard', { waitUntil: 'load' });

    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let maxLcp = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.startTime > maxLcp) {
              maxLcp = entry.startTime;
            }
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(Math.round(maxLcp));
        }, 3000);
      });
    });

    console.log('[PERF_AUDIT] /dashboard LCP (ms):', lcp);

    // Measure Total Blocking Time (TBT) using long tasks (> 50ms)
    const tbt = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let totalBlocking = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration > 50) {
              totalBlocking += entry.duration - 50;
            }
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(Math.round(totalBlocking));
        }, 3000);
      });
    });

    console.log('[PERF_AUDIT] /dashboard Total Blocking Time (ms):', tbt);
    expect(tbt).toBeLessThanOrEqual(500);
  });

  test('03. Properties Hub Navigation & Hydration (/dashboard/properties)', async ({ page }) => {
    await loginAs(page, 'landlord');
    const startNav = Date.now();
    await page.goto('/dashboard/properties', { waitUntil: 'domcontentloaded' });
    const elapsedDom = Date.now() - startNav;

    console.log('[PERF_AUDIT] /dashboard/properties DOMContentLoaded elapsed:', elapsedDom, 'ms');
    expect(elapsedDom).toBeLessThan(4000);

    // Verify properties table or placeholder is visible without hydration errors
    await expect(page.locator('h1, h2, div').filter({ hasText: /Properties/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('04. Financials / Money Route Client Transition Timing', async ({ page }) => {
    await loginAs(page, 'landlord');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Measure client-side router transition to /dashboard/money
    const startTransition = Date.now();
    await page.click('a[href="/dashboard/money"]');
    await page.waitForURL('**/dashboard/money**', { timeout: 10000 });
    const transitionDuration = Date.now() - startTransition;

    console.log('[PERF_AUDIT] Client-side transition to /dashboard/money took:', transitionDuration, 'ms');
    expect(transitionDuration).toBeLessThan(2500);
  });
});
