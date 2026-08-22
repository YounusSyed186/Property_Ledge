'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import {
  createManualCheckoutSession as createManualCheckoutSessionService,
  submitManualPayment as submitManualPaymentService,
  approveManualPayment as approveManualPaymentService,
  rejectManualPayment as rejectManualPaymentService,
} from '@/lib/billing/service';

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
  return submitManualPaymentService(paymentId, details);
}

export async function handleApprovePayment(paymentId: string) {
  const user = await getCurrentUser();
  const adminId = user?.id || 'admin';
  return approveManualPaymentService(paymentId, adminId);
}

export async function handleRejectPayment(paymentId: string) {
  const user = await getCurrentUser();
  const adminId = user?.id || 'admin';
  return rejectManualPaymentService(paymentId, adminId);
}
