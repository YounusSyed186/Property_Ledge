import { Page, Locator, expect } from '@playwright/test';

export class TeamPage {
  readonly page: Page;
  readonly addMemberButton: Locator;
  readonly seatBadge: Locator;
  readonly membersTab: Locator;
  readonly invitationsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addMemberButton = page.locator('button:has-text("Add Member")');
    this.seatBadge = page.locator('text=/seats used/i');
    this.membersTab = page.locator('button:has-text("Members")');
    this.invitationsTab = page.locator('button:has-text("Pending Invitations")');
  }

  async goto() {
    await this.page.goto('/dashboard/team');
  }

  async openAddMemberModal() {
    await this.addMemberButton.click();
  }
}
