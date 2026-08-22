export interface CheckoutSessionOptions {
  accountId: string;
  planSlug: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface BillingPortalOptions {
  accountId: string;
  returnUrl: string;
}

export interface BillingPortalResult {
  url: string;
}

export interface WebhookEventPayload {
  id: string;
  type: string;
  accountId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  planSlug?: string;
  data: Record<string, unknown>;
}

export interface IBillingProvider {
  createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSessionResult>;
  createPortalSession(options: BillingPortalOptions): Promise<BillingPortalResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  parseWebhookEvent(body: unknown): WebhookEventPayload;
}
