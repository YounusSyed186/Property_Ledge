import React from 'react';
import { getAdminSubscriptionById, getAdminPlans } from '@/lib/admin/queries';
import { adminUpdateSubscription } from '@/lib/admin/service';
import { SubscriptionStatusBadge } from '@/components/subscription/subscription-status';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle, XCircle } from 'lucide-react';

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
        {/* Info Card */}
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
