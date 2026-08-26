import React from 'react';
import { getCurrentUser } from '@/lib/auth/queries';
import { getSubscription } from '@/lib/subscriptions/queries';
import { getEntitlements } from '@/lib/entitlements/queries';
import { SubscriptionStatusCard } from '@/components/subscription/subscription-status';
import { EntitlementListCard } from '@/components/subscription/entitlement-list';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CreditCard } from 'lucide-react';
import { PageContainer } from '@/components/admin/ui';

export const revalidate = 0;

export default async function SubscriptionDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscription(user.id);
  const entitlements = await getEntitlements(user.id);

  return (
    <PageContainer>
      <div className="max-w-5xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-admin-foreground">Account Subscription</h2>
            <p className="mt-1 text-sm text-admin-muted">
              Manage your subscription plan, features, and usage limits.
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-admin-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
          >
            <CreditCard className="h-4 w-4" /> Change / Upgrade Plan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <SubscriptionStatusCard subscription={subscription} />
        <EntitlementListCard entitlements={entitlements} />
      </div>
    </PageContainer>
  );
}
