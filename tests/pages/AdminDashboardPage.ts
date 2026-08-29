import { Page, Locator, expect } from '@playwright/test';

export class AdminDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly platformOverviewCard: Locator;
  readonly totalAccountsCard: Locator;
  readonly activeSubscriptionsCard: Locator;
  readonly usersNavLink: Locator;
  readonly subscriptionsNavLink: Locator;
  readonly activityNavLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2').filter({ hasText: /Admin|Platform/i });
    this.platformOverviewCard = page.locator('text=Platform Overview');
    this.totalAccountsCard = page.locator('text=Total Accounts');
    this.activeSubscriptionsCard = page.locator('text=Active Subscriptions');
    this.usersNavLink = page.locator('a[href="/admin/users"]');
    this.subscriptionsNavLink = page.locator('a[href="/admin/subscriptions"]');
    this.activityNavLink = page.locator('a[href="/admin/activity"]');
  }

  async goto() {
    await this.page.goto('/admin');
  }

  async assertLoaded() {
    await expect(this.platformOverviewCard).toBeVisible({ timeout: 10000 });
  }
}
