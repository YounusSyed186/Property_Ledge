import React from 'react';
import { getAdminSubscriptionById, getAdminPlans } from '@/lib/admin/queries';
import { adminUpdateSubscription } from '@/lib/admin/service';
import { getSubscriptionPaymentBySubId, getPaymentProofByPaymentId, approveManualPayment, rejectManualPayment } from '@/lib/billing/service';
import { requireAdmin } from '@/lib/admin/authorization';
import { SubscriptionStatusBadge } from '@/components/subscription/subscription-status';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle, XCircle, FileText, Download } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSubscriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const sub = await getAdminSubscriptionById(id);

  if (!sub) {
    notFound();
  }

  const plans = await getAdminPlans();
  const profile = sub.account_context?.profiles;

  // Manual payment details
  const payment = await getSubscriptionPaymentBySubId(id);
  const proof = payment ? await getPaymentProofByPaymentId(payment.id) : null;

  async function handleUpdateSubscriptionAction(formData: FormData) {
    'use server';
    const status = formData.get('status') as any;
    const planId = formData.get('planId') as string;
    const cancelAtPeriodEnd = formData.get('cancelAtPeriodEnd') === 'true';

    await adminUpdateSubscription(id, {
      status,
      plan_id: planId,
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    redirect(`/admin/subscriptions/${id}?updated=true`);
  }

  async function handleApprovePaymentAction(formData: FormData) {
    'use server';
    const adminId = await requireAdmin();
    const payId = formData.get('paymentId') as string;
    await approveManualPayment(payId, adminId);
    redirect(`/admin/subscriptions/${id}?approved=true`);
  }

  async function handleRejectPaymentAction(formData: FormData) {
    'use server';
    const adminId = await requireAdmin();
    const payId = formData.get('paymentId') as string;
    await rejectManualPayment(payId, adminId);
    redirect(`/admin/subscriptions/${id}?rejected=true`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/subscriptions"
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Subscription Details</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{sub.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Information</h3>
                <p className="text-sm text-slate-500">{profile?.full_name || 'No Name Provided'}</p>
              </div>
              <SubscriptionStatusBadge status={sub.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400">Account ID</span>
                <p className="font-mono text-slate-800 dark:text-slate-200 font-medium">{sub.account_id}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Current Plan</span>
                <p className="font-bold text-indigo-600 dark:text-indigo-400">{sub.subscription_plans?.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Provider</span>
                <p className="font-mono text-slate-800 dark:text-slate-200 uppercase">{sub.provider || 'stripe'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Cancel at Period End</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {sub.cancel_at_period_end ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Current Period Start</span>
                <p className="text-slate-800 dark:text-slate-200">
                  {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Current Period End</span>
                <p className="text-slate-800 dark:text-slate-200">
                  {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Manual Payment Verification Card */}
          {payment && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bank Transfer Verification</h3>
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Ref: {payment.reference}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400">Payment Status</span>
                  <p className="font-bold uppercase text-slate-900 dark:text-white mt-0.5">{payment.status}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Expected / Submitted</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    ${payment.expected_amount} / ${payment.submitted_amount || 0} AUD
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Transaction ID</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{payment.transaction_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Payment Date</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Uploaded Proof */}
              {proof && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{proof.file_name}</p>
                      <p className="text-[10px] text-slate-400">{(proof.file_size / 1024).toFixed(1)} KB • {proof.mime_type}</p>
                    </div>
                  </div>

                  {proof.file_preview_url && (
                    <a
                      href={proof.file_preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <Download className="h-3.5 w-3.5" /> View Receipt
                    </a>
                  )}
                </div>
              )}

              {/* Approval Actions */}
              <div className="flex items-center gap-3 pt-2">
                <form action={handleApprovePaymentAction} className="flex-1">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve Payment & Activate Sub
                  </button>
                </form>

                <form action={handleRejectPaymentAction} className="flex-1">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                  >
                    <XCircle className="h-4 w-4" /> Reject Payment
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Actions Sidebar Form */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Admin Actions</h3>

            <form action={handleUpdateSubscriptionAction} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Plan
                </label>
                <select
                  name="planId"
                  defaultValue={sub.plan_id}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Status
                </label>
                <select
                  name="status"
                  defaultValue={sub.status}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="under_review">Under Review</option>
                  <option value="pending_payment">Pending Payment</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="paused">Paused</option>
                  <option value="canceled">Canceled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cancellation Rule
                </label>
                <select
                  name="cancelAtPeriodEnd"
                  defaultValue={sub.cancel_at_period_end ? 'true' : 'false'}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="false">Immediate / Active</option>
                  <option value="true">Cancel at Period End</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Update Subscription
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
