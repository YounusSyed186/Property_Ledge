export interface CheckoutSessionOptions {
  accountId: string;
  planSlug: string;
  interval?: 'monthly' | 'yearly';
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface BillingPortalOptions {
  accountId: string;
  returnUrl?: string;
}

export interface BillingPortalResult {
  url: string;
}

export interface WebhookEventPayload {
  id: string;
  type: string;
  accountId?: string;
  planSlug?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  data: Record<string, any>;
}

export interface IBillingProvider {
  createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSessionResult>;
  createPortalSession(options: BillingPortalOptions): Promise<BillingPortalResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  parseWebhookEvent(body: unknown): WebhookEventPayload;
}

export const BANK_DETAILS = {
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "PROPERTYLEDGE PTY LTD",
  bankName: process.env.NEXT_PUBLIC_BANK_NAME || "National Australia Bank (NAB)",
  bsb: process.env.NEXT_PUBLIC_BANK_BSB || "083-004",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "9876 54321",
  referencePrefix: process.env.NEXT_PUBLIC_BANK_REFERENCE_PREFIX || "PL-2026-",
};
