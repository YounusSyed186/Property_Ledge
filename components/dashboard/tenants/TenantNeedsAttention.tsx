'use client';

import React, { useMemo } from 'react';
import { Clock, AlertTriangle, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  id: string;
  type: 'expiring' | 'no-lease' | 'prospect';
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  actionText?: string;
  filterType?: string;
}

export interface TenantNeedsAttentionProps {
  tenants: Array<{
    id: string;
    status?: string;
    lease_tenants?: Array<{
      lease?: {
        id: string;
        status: string;
        end_date: string | null;
      } | null;
    }>;
  }>;
  onFilterClick?: (filter: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function TenantNeedsAttention({
  tenants = [],
  onFilterClick,
  isLoading = false,
  className,
}: TenantNeedsAttentionProps) {
  const items = useMemo<AttentionItem[]>(() => {
    let expiringCount = 0;
    let noLeaseCount = 0;
    let prospectCount = 0;

    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    tenants.forEach((t) => {
      const status = (t.status || '').toLowerCase();
      if (status === 'prospect' || status === 'applicant' || status === 'pending') {
        prospectCount += 1;
      }

      const activeLease = t.lease_tenants?.find((lt) => lt.lease?.status === 'active')?.lease || t.lease_tenants?.[0]?.lease;
      if (!activeLease || activeLease.status !== 'active') {
        if (status !== 'archived') {
          noLeaseCount += 1;
        }
      } else if (activeLease.end_date) {
        const endDate = new Date(activeLease.end_date);
        if (endDate >= now && endDate <= sixtyDaysFromNow) {
          expiringCount += 1;
        }
      }
    });

    const result: AttentionItem[] = [];

    if (expiringCount > 0) {
      result.push({
        id: 'expiring',
        type: 'expiring',
        title: `${expiringCount} ${expiringCount === 1 ? 'lease' : 'leases'} expiring soon`,
        subtitle: 'Review and renew leases',
        count: expiringCount,
        icon: <Clock className="w-4 h-4" />,
        iconBg: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200/80 dark:border-amber-500/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        actionText: 'View',
        filterType: 'Active Resident',
      });
    }

    if (noLeaseCount > 0) {
      result.push({
        id: 'no-lease',
        type: 'no-lease',
        title: `${noLeaseCount} ${noLeaseCount === 1 ? 'tenant' : 'tenants'} without an active lease`,
        subtitle: 'Assign or create a lease',
        count: noLeaseCount,
        icon: <AlertTriangle className="w-4 h-4" />,
        iconBg: 'bg-orange-50 dark:bg-orange-500/15 border-orange-200/80 dark:border-orange-500/30',
        iconColor: 'text-orange-600 dark:text-orange-400',
        actionText: 'View',
        filterType: 'All',
      });
    }

    if (prospectCount > 0) {
      result.push({
        id: 'prospect',
        type: 'prospect',
        title: `${prospectCount} ${prospectCount === 1 ? 'prospect / applicant' : 'prospects / applicants'}`,
        subtitle: 'Complete tenant setup',
        count: prospectCount,
        icon: <UserPlus className="w-4 h-4" />,
        iconBg: 'bg-purple-50 dark:bg-purple-500/15 border-purple-200/80 dark:border-purple-500/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        actionText: 'View',
        filterType: 'Prospect / Applicant',
      });
    }

    return result;
  }, [tenants]);

  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between',
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
          <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">
            Needs Attention
          </h3>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">All caught up</h4>
              <p className="text-[11px] text-slate-400 dark:text-[#7F8B99] mt-0.5">
                No tenant or lease items require attention.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.filterType && onFilterClick?.(item.filterType)}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-[#0E1E33]/60 border border-slate-200/50 dark:border-[#17283A] hover:bg-slate-100/80 dark:hover:bg-[#0E1E33] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                        item.iconBg,
                        item.iconColor
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#7F8B99] truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] group-hover:translate-x-0.5 transition-transform shrink-0 inline-flex items-center gap-1">
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
