import React from 'react';
import { getAdminSubscriptions } from '@/lib/admin/queries';
import { SubscriptionStatusBadge } from '@/components/subscription/subscription-status';
import Link from 'next/link';
import { Search, Filter, Eye } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const status = params.status || 'all';
  const search = params.search || '';

  const { data: subscriptions, totalPages, total } = await getAdminSubscriptions({
    page,
    limit: 10,
    search,
    status,
  });

  const statuses = ['all', 'active', 'trialing', 'past_due', 'paused', 'canceled', 'expired'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Account Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and manage account subscriptions across the platform.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
        <Filter className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
        {statuses.map((st) => (
          <Link
            key={st}
            href={`/admin/subscriptions?status=${st}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
              status === st
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {st.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
              <tr>
                <th className="px-6 py-3.5">Account ID / User</th>
                <th className="px-6 py-3.5">Current Plan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Provider</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No subscriptions found matching criteria.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub: any) => {
                  const profile = sub.account_context?.profiles;
                  const name = profile?.full_name || sub.account_id;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div>{name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{sub.account_id}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        {sub.subscription_plans?.name || 'Unknown Plan'}
                      </td>
                      <td className="px-6 py-4">
                        <SubscriptionStatusBadge status={sub.status} />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs uppercase text-slate-500">
                        {sub.provider || 'stripe'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
