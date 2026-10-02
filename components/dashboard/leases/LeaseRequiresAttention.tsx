'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, FileText, Info, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttentionActionItem {
  id: string;
  type: 'expiring' | 'periodic' | 'draft';
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  filterTab: string;
}

export interface LeaseRequiresAttentionProps {
  leases: Array<{
    id: string;
    status: string;
    end_date: string | null;
  }>;
  onFilterClick?: (filterTab: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function LeaseRequiresAttention({
  leases = [],
  onFilterClick,
  isLoading = false,
  className,
}: LeaseRequiresAttentionProps) {
  const items = useMemo<AttentionActionItem[]>(() => {
    let expiringCount = 0;
    let periodicCount = 0;
    let draftCount = 0;

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    leases.forEach((l) => {
      const st = (l.status || '').toLowerCase();
      if (st === 'draft' || st === 'pending') {
        draftCount += 1;
      }
      if (st === 'active' && !l.end_date) {
        periodicCount += 1;
      }
      if (st === 'active' && l.end_date) {
        const endDate = new Date(l.end_date);
        if (endDate >= now && endDate <= ninetyDaysFromNow) {
          expiringCount += 1;
        }
      }
    });

    return [
      {
        id: 'expiring',
        type: 'expiring',
        title: `${expiringCount} ${expiringCount === 1 ? 'lease' : 'leases'} expiring soon`,
        subtitle:
          expiringCount > 0
            ? 'Review upcoming renewals'
            : 'No leases are expiring in the next 3 months',
        count: expiringCount,
        icon: <AlertTriangle className="w-4 h-4" />,
        iconBg:
          expiringCount > 0
            ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200/80 dark:border-rose-500/30'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/50',
        iconColor:
          expiringCount > 0
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-400 dark:text-slate-400',
        filterTab: 'Active',
      },
      {
        id: 'periodic',
        type: 'periodic',
        title: `${periodicCount} ${periodicCount === 1 ? 'periodic lease' : 'periodic leases'}`,
        subtitle:
          periodicCount > 0
            ? 'Review month-to-month arrangements'
            : 'All active leases have fixed terms',
        count: periodicCount,
        icon: <FileText className="w-4 h-4" />,
        iconBg:
          periodicCount > 0
            ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-200/80 dark:border-sky-500/30'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/50',
        iconColor:
          periodicCount > 0
            ? 'text-sky-600 dark:text-sky-400'
            : 'text-slate-400 dark:text-slate-400',
        filterTab: 'Active',
      },
      {
        id: 'draft',
        type: 'draft',
        title: `${draftCount} ${draftCount === 1 ? 'draft lease' : 'draft leases'}`,
        subtitle:
          draftCount > 0 ? 'Complete lease setup' : 'All leases are active or completed',
        count: draftCount,
        icon: <Info className="w-4 h-4" />,
        iconBg:
          draftCount > 0
            ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200/80 dark:border-indigo-500/30'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/50',
        iconColor:
          draftCount > 0
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-400 dark:text-slate-400',
        filterTab: 'Pending',
      },
    ];
  }, [leases]);

  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between',
        className
      )}
    >
      <div>
        {/* Header & View All */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
          <h3 className="text-sm sm:text-base font-heading font-bold text-slate-900 dark:text-white">
            Requires Attention
          </h3>

          <button
            type="button"
            onClick={() => onFilterClick?.('All')}
            className="text-xs sm:text-[13px] font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline inline-flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Action Items List */}
        <div className="space-y-2.5 pt-3.5">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => onFilterClick?.(item.filterTab)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-[#0E1E33]/60 border border-slate-200/70 dark:border-[#17283A] hover:bg-white dark:hover:bg-[#0E1E33] hover:border-[#008F83]/40 dark:hover:border-[#008F83]/40 hover:shadow-xs transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-9.5 h-9.5 rounded-xl flex items-center justify-center shrink-0 border select-none',
                      item.iconBg,
                      item.iconColor
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13px] truncate group-hover:text-[#008F83] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#7F8B99] truncate mt-0.5 font-normal">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#008F83] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
