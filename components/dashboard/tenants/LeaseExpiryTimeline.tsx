'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaseExpiryTimelineProps {
  tenants: Array<{
    id: string;
    lease_tenants?: Array<{
      lease?: {
        id: string;
        status: string;
        end_date: string | null;
      } | null;
    }>;
  }>;
  isLoading?: boolean;
  className?: string;
}

export function LeaseExpiryTimeline({
  tenants = [],
  isLoading = false,
  className,
}: LeaseExpiryTimelineProps) {
  const [timeframeMonths, setTimeframeMonths] = useState<number>(6);

  const monthBuckets = useMemo(() => {
    const buckets: Array<{ key: string; label: string; count: number; date: Date }> = [];
    const now = new Date();

    for (let i = 0; i < timeframeMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label, count: 0, date: d });
    }

    tenants.forEach((t) => {
      const activeLease = t.lease_tenants?.find((lt) => lt.lease?.status === 'active')?.lease || t.lease_tenants?.[0]?.lease;
      if (activeLease && activeLease.end_date) {
        const endDate = new Date(activeLease.end_date);
        const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
        const match = buckets.find((b) => b.key === endKey);
        if (match) {
          match.count += 1;
        }
      }
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);

    return {
      buckets,
      maxCount,
      totalExpiring: buckets.reduce((sum, b) => sum + b.count, 0),
    };
  }, [tenants, timeframeMonths]);

  return (
    <div
      className={cn(
        'rounded-[20px] sm:rounded-[24px] border border-[#17283A] bg-[#061222] p-4 sm:p-5 shadow-xl flex flex-col justify-between text-white',
        className
      )}
    >
      <div>
        {/* Header with Timeframe Selector */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#17283A]">
          <div>
            <h3 className="text-sm font-heading font-bold text-white">
              Lease Expiry Timeline
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-0.5 font-normal">
              Upcoming lease expirations
            </p>
          </div>

          <div className="relative shrink-0">
            <select
              value={timeframeMonths}
              onChange={(e) => setTimeframeMonths(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-[#0E1E33] border border-[#17283A] text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#32D5C4] cursor-pointer"
            >
              <option value={3}>Next 3 Months</option>
              <option value={6}>Next 6 Months</option>
              <option value={12}>Next 12 Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Timeline Horizontal Bar Visualization */}
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 rounded-lg bg-[#0E1E33] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {monthBuckets.buckets.map((b) => {
                const widthPercent = b.count > 0 ? Math.max(12, Math.round((b.count / monthBuckets.maxCount) * 100)) : 0;
                return (
                  <div
                    key={b.key}
                    className="flex items-center gap-3 text-xs p-2 rounded-xl bg-[#0E1E33]/60 border border-[#17283A] hover:border-[#008F83]/40 transition-colors"
                  >
                    <span className="w-20 shrink-0 font-medium text-[#94A3B8] truncate text-[11.5px]">
                      {b.label}
                    </span>

                    <div className="flex-1 h-3 bg-[#061222] rounded-full overflow-hidden flex items-center p-0.5 border border-[#17283A]">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${widthPercent}%`,
                          background: b.count > 0 ? 'linear-gradient(90deg, #007F78 0%, #009B91 100%)' : 'transparent',
                        }}
                      />
                    </div>

                    <span className="w-5 text-right font-bold text-[#32D5C4] tabular-nums shrink-0 text-xs">
                      {b.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

