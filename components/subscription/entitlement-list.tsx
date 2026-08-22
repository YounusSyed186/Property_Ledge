'use client';

import React from 'react';
import { EntitlementMap } from '@/types/subscriptions';
import { CheckCircle2, XCircle, Hash, Sparkles } from 'lucide-react';

interface EntitlementListProps {
  entitlements: EntitlementMap;
}

export function EntitlementListCard({ entitlements }: EntitlementListProps) {
  const entries = Object.entries(entitlements);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">No entitlements found for this account.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Plan Features & Limits</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, value]) => {
          const isBool = typeof value === 'boolean';
          const isNum = typeof value === 'number';

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{key}</span>

              {isBool ? (
                value ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Enabled
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    <XCircle className="h-4 w-4" /> Disabled
                  </span>
                )
              ) : isNum ? (
                <span className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Hash className="h-3.5 w-3.5" /> {value}
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-900 dark:text-white">{String(value)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
