'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import {
  createManualCheckoutSession as createManualCheckoutSessionService,
  submitManualPayment as submitManualPaymentService,
  approveManualPayment as approveManualPaymentService,
  rejectManualPayment as rejectManualPaymentService,
} from '@/lib/billing/service';
import { notificationService } from '@/lib/notifications/service';
import { recordAdminAudit } from '@/lib/admin/service';
import { createAdminClient } from '@/lib/supabase/server';

export async function handleCreateManualCheckoutSession(planSlug: string, billingInterval: 'monthly' | 'yearly') {
  const user = await getCurrentUser();
  const accountId = user?.id || 'demo-user';
  return createManualCheckoutSessionService(accountId, planSlug, billingInterval);
}

export async function handleSubmitManualPayment(
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
  const payment = await submitManualPaymentService(paymentId, details);

  // Trigger SUBSCRIPTION_REQUESTED notification event
  try {
    const supabase = await createAdminClient();
    const { data: payRecord } = await (supabase as any)
      .from('subscription_payments')
      .select('*, subscriptions!fk_subscription_payments_sub_account(*, subscription_plans(*))')
      .eq('id', paymentId)
      .maybeSingle();

    if (payRecord) {
      const accountId = payRecord.account_id;
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(accountId);

      const customerEmail =
        authUser?.user?.email ||
        profile?.email ||
        'customer@propertyledge.com.au';

      const customerName =
        profile?.full_name ||
        authUser?.user?.user_metadata?.full_name ||
        'Customer';

      const planName = payRecord.subscriptions?.subscription_plans?.name || 'Landlord';

      await notificationService.notifySubscriptionRequested({
        accountName: customerName,
        accountEmail: customerEmail,
        planName,
        amount: details.submittedAmount,
        reference: payRecord.reference || paymentId,
      });
    }
  } catch (err) {
    console.error('[billing.ts] Notification trigger exception:', err);
  }

  return payment;
}

export async function handleApprovePayment(paymentId: string) {
  const user = await getCurrentUser();
  const adminId = user?.id || 'admin';
  const payment = await approveManualPaymentService(paymentId, adminId);

  // Record audit log
  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_ACCEPTED', 'subscription_payment', paymentId, {
    subscriptionId: payment.subscription_id,
  });

  // Trigger SUBSCRIPTION_ACCEPTED notification event
  try {
    const supabase = await createAdminClient();
    const { data: payRecord } = await (supabase as any)
      .from('subscription_payments')
      .select('*, subscriptions!fk_subscription_payments_sub_account(*, subscription_plans(*))')
      .eq('id', paymentId)
      .maybeSingle();

    if (payRecord) {
      const accountId = payRecord.account_id;
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(accountId);

      const customerEmail =
        authUser?.user?.email ||
        profile?.email ||
        'customer@propertyledge.com.au';

      const customerName =
        profile?.full_name ||
        authUser?.user?.user_metadata?.full_name ||
        'Customer';

      const planName = payRecord.subscriptions?.subscription_plans?.name || 'Landlord';

      await notificationService.notifySubscriptionAccepted({
        accountName: customerName,
        accountEmail: customerEmail,
        planName,
        effectiveDate: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[billing.ts] Subscription approval notification exception:', err);
  }

  return payment;
}

export async function handleRejectPayment(paymentId: string) {
  const user = await getCurrentUser();
  const adminId = user?.id || 'admin';
  const payment = await rejectManualPaymentService(paymentId, adminId);

  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_REJECTED', 'subscription_payment', paymentId, {
    subscriptionId: payment.subscription_id,
  });

  return payment;
}
