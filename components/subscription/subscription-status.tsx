'use client';

import React from 'react';
import { ActiveSubscriptionWithPlan } from '@/types/subscriptions';
import { ShieldCheck, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface SubscriptionStatusProps {
  subscription: ActiveSubscriptionWithPlan | null;
}

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    trialing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    past_due: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    canceled: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    expired: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    under_review: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
    pending_payment: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    draft: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${styles[status] || styles.active}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace('_', ' ')}
    </span>
  );
}

export function SubscriptionStatusCard({ subscription }: SubscriptionStatusProps) {
  if (!subscription) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Active Subscription</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Choose a subscription plan to unlock features.</p>
          </div>
        </div>
      </div>
    );
  }

  const plan = subscription.subscription_plans;
  const renewalDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-indigo-50 p-3.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name} Plan</h3>
              <SubscriptionStatusBadge status={subscription.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0 dark:border-slate-800 text-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Next Renewal / Period End</span>
            </div>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{renewalDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
