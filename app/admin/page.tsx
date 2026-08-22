import React from 'react';
import { getAdminOverviewMetrics } from '@/lib/admin/queries';
import { Users, CreditCard, Clock, AlertTriangle, XCircle, Layers } from 'lucide-react';

export const revalidate = 0;

export default async function AdminOverviewPage() {
  const metrics = await getAdminOverviewMetrics();

  const cards = [
    { name: 'Total Accounts', value: metrics.totalAccounts, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
    { name: 'Active Subscriptions', value: metrics.activeSubscriptions, icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { name: 'Trialing Subscriptions', value: metrics.trialingSubscriptions, icon: Clock, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { name: 'Past Due Subscriptions', value: metrics.pastDueSubscriptions, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
    { name: 'Canceled Subscriptions', value: metrics.canceledSubscriptions, icon: XCircle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400' },
    { name: 'Active Plans', value: metrics.availablePlans, icon: Layers, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Admin Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          High-level metrics for Phase 2 subscriptions and entitlements.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={`rounded-xl p-3.5 ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
