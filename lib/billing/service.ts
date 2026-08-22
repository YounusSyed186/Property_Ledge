import { createClient } from '@/lib/supabase/server';
import { billingProvider } from './provider';
import { CheckoutSessionOptions, CheckoutSessionResult, BillingPortalOptions, BillingPortalResult } from './types';
import { createSubscription, updateSubscription } from '@/lib/subscriptions/service';
import { getSubscription } from '@/lib/subscriptions/queries';
import { logAuthEvent } from '@/lib/debug/logger';

export async function createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSessionResult> {
  logAuthEvent('CHECKOUT_STARTED', { accountId: options.accountId, planSlug: options.planSlug });
  try {
    const session = await billingProvider.createCheckoutSession(options);
    logAuthEvent('CHECKOUT_CREATED', { accountId: options.accountId, sessionId: session.sessionId });
    return session;
  } catch (err: any) {
    logAuthEvent('CHECKOUT_FAILED', { accountId: options.accountId, error: err.message });
    throw err;
  }
}

export async function createPortalSession(options: BillingPortalOptions): Promise<BillingPortalResult> {
  return billingProvider.createPortalSession(options);
}

export async function processWebhookEvent(rawBody: string, signature: string, secret: string) {
  logAuthEvent('BILLING_WEBHOOK_RECEIVED');

  // Verify signature
  const isValid = billingProvider.verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    logAuthEvent('BILLING_WEBHOOK_FAILED', { reason: 'Invalid signature' });
    throw new Error('WEBHOOK_INVALID_SIGNATURE: Invalid webhook signature');
  }

  logAuthEvent('BILLING_WEBHOOK_VALIDATED');
  const event = billingProvider.parseWebhookEvent(rawBody);

  const supabase = await createClient();

  // Idempotency check in subscription_events
  const { data: existingEvent } = await (supabase as any)
    .from('subscription_events')
    .select('id, status')
    .eq('provider_event_id', event.id)
    .maybeSingle();

  if (existingEvent && existingEvent.status === 'processed') {
    logAuthEvent('BILLING_WEBHOOK_DUPLICATE', { eventId: event.id });
    return { status: 'already_processed', eventId: event.id };
  }

  // Record received event
  await (supabase as any)
    .from('subscription_events')
    .upsert({
      provider_event_id: event.id,
      account_id: event.accountId || null,
      provider: 'stripe',
      event_type: event.type,
      payload: event.data,
      status: 'received',
      processed_at: new Date().toISOString(),
    });

  // Handle event types
  if (event.accountId && event.planSlug) {
    // Lookup plan by slug
    const { data: plan } = await (supabase as any)
      .from('subscription_plans')
      .select('id')
      .eq('slug', event.planSlug)
      .single();

    if (plan) {
      const existingSub = await getSubscription(event.accountId);
      if (existingSub) {
        await updateSubscription(existingSub.id, {
          plan_id: plan.id,
          status: 'active',
          provider_customer_id: event.providerCustomerId || existingSub.provider_customer_id,
          provider_subscription_id: event.providerSubscriptionId || existingSub.provider_subscription_id,
        });
      } else {
        await createSubscription(event.accountId, plan.id, 'active', {
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
        });
      }
    }
  }

  // Mark event as processed
  await (supabase as any)
    .from('subscription_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('provider_event_id', event.id);

  logAuthEvent('BILLING_WEBHOOK_PROCESSED', { eventId: event.id });
  return { status: 'success', eventId: event.id };
}
