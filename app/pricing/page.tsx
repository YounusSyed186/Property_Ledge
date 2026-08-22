import React from 'react';
import { getSubscriptionPlans, getSubscription } from '@/lib/subscriptions/queries';
import { getCurrentUser } from '@/lib/auth/queries';
import { PlanCard } from '@/components/subscription/plan-card';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function PricingPage() {
  const plans = await getSubscriptionPlans();
  const user = await getCurrentUser();
  const subscription = user ? await getSubscription(user.id) : null;
  const currentPlanSlug = subscription?.subscription_plans?.slug;

  async function handleSelectPlanAction(formData: FormData) {
    'use server';
    const planSlug = formData.get('planSlug') as string;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/login?redirectTo=/checkout?plan=${planSlug}`);
    }

    redirect(`/checkout?plan=${planSlug}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Flexible Plans for Property Management
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Choose the right subscription plan to power your real estate portfolio with confidence.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const isPopular = plan.slug === 'pro';
            return (
              <form key={plan.id} action={handleSelectPlanAction}>
                <input type="hidden" name="planSlug" value={plan.slug} />
                <PlanCard
                  plan={plan}
                  currentPlanSlug={currentPlanSlug}
                  isPopular={isPopular}
                />
              </form>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/subscription" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            View Current Subscription Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
