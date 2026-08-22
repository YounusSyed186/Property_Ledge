import React from 'react';
import { getCurrentUser } from '@/lib/auth/queries';
import { getSubscription } from '@/lib/subscriptions/queries';
import { getEntitlements } from '@/lib/entitlements/queries';
import { SubscriptionStatusCard } from '@/components/subscription/subscription-status';
import { EntitlementListCard } from '@/components/subscription/entitlement-list';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CreditCard } from 'lucide-react';

export const revalidate = 0;

export default async function SubscriptionDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscription(user.id);
  const entitlements = await getEntitlements(user.id);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Account Subscription</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your subscription plan, features, and usage limits.
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <CreditCard className="h-4 w-4" /> Change / Upgrade Plan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Subscription Status Card */}
        <SubscriptionStatusCard subscription={subscription} />

        {/* Entitlements & Features Grid */}
        <EntitlementListCard entitlements={entitlements} />
      </div>
    </div>
  );
}
