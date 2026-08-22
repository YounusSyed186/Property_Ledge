import { createClient } from '@/lib/supabase/server';
import { billingProvider } from './provider';
import { CheckoutSessionOptions, CheckoutSessionResult, BillingPortalOptions, BillingPortalResult, BANK_DETAILS } from './types';
import { createSubscription, updateSubscription } from '@/lib/subscriptions/service';
import { getSubscription } from '@/lib/subscriptions/queries';
import { logAuthEvent } from '@/lib/debug/logger';
import { SubscriptionPayment, PaymentProof } from '@/types/subscriptions';

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

export async function createManualCheckoutSession(
  accountId: string,
  planSlug: string,
  billingInterval: 'monthly' | 'yearly' = 'monthly'
): Promise<{ subscriptionId: string; paymentId: string; reference: string; expectedAmount: number }> {
  const supabase = await createClient();

  // Fetch plan
  const { data: plan, error: planErr } = await (supabase as any)
    .from('subscription_plans')
    .select('*')
    .eq('slug', planSlug)
    .single();

  if (planErr || !plan) {
    throw new Error(`Plan '${planSlug}' not found.`);
  }

  const multiplier = billingInterval === 'yearly' ? 10 : 1;
  const priceDollars = plan.price_cents / 100;
  const expectedAmount = Number((priceDollars * multiplier).toFixed(2));

  // Generate unique reference
  const randomRef = Math.floor(100000 + Math.random() * 900000);
  const reference = `${BANK_DETAILS.referencePrefix}${randomRef}`;

  // Check if existing pending or draft subscription exists for account
  const { data: existingSub } = await (supabase as any)
    .from('subscriptions')
    .select('id, status')
    .eq('account_id', accountId)
    .in('status', ['draft', 'pending_payment'])
    .maybeSingle();

  let subscriptionId: string;

  if (existingSub) {
    subscriptionId = existingSub.id;
    await updateSubscription(subscriptionId, {
      plan_id: plan.id,
      status: 'pending_payment',
    });
  } else {
    const newSub = await createSubscription(accountId, plan.id, 'pending_payment');
    if (!newSub) throw new Error('Failed to create subscription.');
    subscriptionId = newSub.id;
  }

  // Create payment record
  const { data: payment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .insert({
      subscription_id: subscriptionId,
      account_id: accountId,
      reference,
      expected_amount: expectedAmount,
      currency: 'AUD',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (payErr) {
    throw new Error(`Failed to create payment record: ${payErr.message}`);
  }

  return {
    subscriptionId,
    paymentId: payment.id,
    reference,
    expectedAmount,
  };
}

export async function submitManualPayment(
  paymentId: string,
  details: {
    submittedAmount: number;
    paymentDate: string;
    transactionId?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
    filePreviewUrl?: string;
  }
) {
  const supabase = await createClient();

  // Update subscription_payments
  const { data: payment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .update({
      submitted_amount: details.submittedAmount,
      payment_date: details.paymentDate,
      transaction_id: details.transactionId || null,
      status: 'under_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (payErr || !payment) {
    throw new Error(`Failed to update payment: ${payErr?.message}`);
  }

  let finalPreviewUrl = details.filePreviewUrl || null;
  const storagePath = `receipts/${paymentId}/${details.fileName}`;

  // Upload file dataUrl to Supabase storage bucket `payment-receipts`
  if (details.filePreviewUrl && details.filePreviewUrl.startsWith('data:')) {
    try {
      const base64Data = details.filePreviewUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      const { error: uploadErr } = await (supabase as any).storage
        .from('payment-receipts')
        .upload(storagePath, buffer, {
          contentType: details.mimeType,
          upsert: true,
        });

      if (!uploadErr) {
        const { data: publicUrlData } = (supabase as any).storage
          .from('payment-receipts')
          .getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          finalPreviewUrl = publicUrlData.publicUrl;
        }
      }
    } catch (stErr) {
      console.warn('Supabase storage bucket upload exception:', stErr);
    }
  }

  // Create payment_proof record
  await (supabase as any)
    .from('payment_proofs')
    .insert({
      payment_id: paymentId,
      storage_path: storagePath,
      file_name: details.fileName,
      mime_type: details.mimeType,
      file_size: details.fileSize,
      file_preview_url: finalPreviewUrl,
      uploaded_at: new Date().toISOString(),
    });

  // Update subscription status to under_review
  await updateSubscription(payment.subscription_id, {
    status: 'under_review',
  });

  return payment;
}

export async function approveManualPayment(paymentId: string, adminId: string) {
  const supabase = await createClient();

  const { data: payment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (payErr || !payment) {
    throw new Error(`Failed to approve payment: ${payErr?.message}`);
  }

  // Activate subscription
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await updateSubscription(payment.subscription_id, {
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: nextMonth.toISOString(),
  });

  return payment;
}

export async function rejectManualPayment(paymentId: string, adminId: string) {
  const supabase = await createClient();

  const { data: payment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .update({
      status: 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (payErr || !payment) {
    throw new Error(`Failed to reject payment: ${payErr?.message}`);
  }

  // Set subscription status back to pending_payment or canceled
  await updateSubscription(payment.subscription_id, {
    status: 'pending_payment',
  });

  return payment;
}

export async function getSubscriptionPaymentBySubId(subscriptionId: string): Promise<SubscriptionPayment | null> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getPaymentProofByPaymentId(paymentId: string): Promise<PaymentProof | null> {
  const supabase = await createClient();
  const { data: proof } = await (supabase as any)
    .from('payment_proofs')
    .select('*')
    .eq('payment_id', paymentId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!proof) return null;

  // If preview URL is missing, generate from Supabase bucket
  if (!proof.file_preview_url && proof.storage_path) {
    const { data: publicUrlData } = (supabase as any).storage
      .from('payment-receipts')
      .getPublicUrl(proof.storage_path);

    if (publicUrlData?.publicUrl) {
      return {
        ...proof,
        file_preview_url: publicUrlData.publicUrl,
      };
    }
  }

  return proof;
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
