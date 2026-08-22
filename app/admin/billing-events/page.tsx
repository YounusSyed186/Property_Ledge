import React from 'react';
import { getAdminBillingEvents } from '@/lib/admin/queries';
import { History, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminBillingEventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);

  const { data: events, totalPages } = await getAdminBillingEvents({ page, limit: 10 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Billing Webhook Events</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Audit history of billing provider webhook events and processing status.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
            <tr>
              <th className="px-6 py-3.5">Provider Event ID</th>
              <th className="px-6 py-3.5">Event Type</th>
              <th className="px-6 py-3.5">Account ID</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Processed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No billing events logged yet.
                </td>
              </tr>
            ) : (
              events.map((evt: any) => (
                <tr key={evt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-900 dark:text-white">{evt.provider_event_id}</td>
                  <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{evt.event_type}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{evt.account_id || '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                        evt.status === 'processed'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : evt.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(evt.processed_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
