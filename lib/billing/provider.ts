import { IBillingProvider, CheckoutSessionOptions, CheckoutSessionResult, BillingPortalOptions, BillingPortalResult, WebhookEventPayload } from './types';

export class MockStripeBillingProvider implements IBillingProvider {
  async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSessionResult> {
    const mockSessionId = `cs_test_${Math.random().toString(36).substring(2, 10)}`;
    const mockUrl = `${options.successUrl}?session_id=${mockSessionId}&plan=${options.planSlug}`;

    return {
      sessionId: mockSessionId,
      url: mockUrl,
    };
  }

  async createPortalSession(options: BillingPortalOptions): Promise<BillingPortalResult> {
    return {
      url: `${options.returnUrl}?portal=active`,
    };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    return signature === secret || signature.startsWith('t=');
  }

  parseWebhookEvent(body: any): WebhookEventPayload {
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        throw new Error('Invalid JSON payload');
      }
    }

    return {
      id: body.id || `evt_${Math.random().toString(36).substring(2, 10)}`,
      type: body.type || 'checkout.session.completed',
      accountId: body.data?.object?.client_reference_id || body.accountId,
      providerCustomerId: body.data?.object?.customer || body.providerCustomerId,
      providerSubscriptionId: body.data?.object?.subscription || body.providerSubscriptionId,
      planSlug: body.data?.object?.metadata?.plan_slug || body.planSlug,
      data: body.data || body,
    };
  }
}

export const billingProvider: IBillingProvider = new MockStripeBillingProvider();
