import { test, expect } from '@playwright/test';
import { buildEmailHtml, emailService } from '../../lib/email/service';

test.describe('Phase 2 Unit Tests - Email Service & Templates', () => {
  test('renders subscription_requested email template for admin correctly', () => {
    const html = buildEmailHtml('subscription_requested', {
      accountName: 'Sarah Williams',
      accountEmail: 'sarah@example.com.au',
      planName: 'Landlord',
      amount: 29,
      reference: 'PL-2026-10482',
    });

    expect(html).toContain('PROPERTY<span style="color:#a9927d;">LEDGE</span>');
    expect(html).toContain('New Subscription Request');
    expect(html).toContain('Sarah Williams');
    expect(html).toContain('Landlord');
    expect(html).toContain('PL-2026-10482');
  });

  test('renders subscription_requested_user email template for user correctly', () => {
    const html = buildEmailHtml('subscription_requested_user', {
      userName: 'Sarah Williams',
      planName: 'Landlord',
      amount: 29,
      reference: 'PL-2026-10482',
    });

    expect(html).toContain('Subscription Request Received');
    expect(html).toContain('Under Review (You will be notified shortly)');
    expect(html).toContain('Sarah Williams');
    expect(html).toContain('Landlord');
  });

  test('renders subscription_accepted email template correctly', () => {
    const html = buildEmailHtml('subscription_accepted', {
      userName: 'Sarah Williams',
      planName: 'Property Manager',
      effectiveDate: '2026-08-23T00:00:00Z',
    });

    expect(html).toContain('Subscription Approved!');
    expect(html).toContain('Property Manager');
    expect(html).toContain('Sarah Williams');
  });

  test('rejects invalid recipient email address formats', async () => {
    const res = await emailService.sendEmail({
      to: 'invalid-email-format',
      subject: 'Test Subject',
      templateType: 'subscription_accepted',
      variables: {},
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INVALID_EMAIL_FORMAT');
  });
});
