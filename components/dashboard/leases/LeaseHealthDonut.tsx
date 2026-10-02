'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaseHealthItem {
  label: string;
  statusKey: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LeaseHealthDonutProps {
  leases: Array<{
    id: string;
    property_id: string;
    status: string;
    end_date: string | null;
  }>;
  properties?: Array<{ id: string; name: string }>;
  selectedPropertyId?: string | null;
  onPropertySelect?: (id: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

export function LeaseHealthDonut({
  leases = [],
  properties = [],
  selectedPropertyId = null,
  onPropertySelect,
  isLoading = false,
  className,
}: LeaseHealthDonutProps) {
  // Derive lease health categories
  const { slices, totalLeases, items } = useMemo(() => {
    let active = 0;
    let periodic = 0;
    let draft = 0;
    let expired = 0;
    let renewed = 0;

    const filtered = selectedPropertyId
      ? leases.filter((l) => l.property_id === selectedPropertyId)
      : leases;

    filtered.forEach((l) => {
      const st = (l.status || '').toLowerCase();
      if (st === 'draft' || st === 'pending') {
        draft += 1;
      } else if (st === 'renewed') {
        renewed += 1;
      } else if (st === 'expired' || (l.end_date && new Date(l.end_date) < new Date())) {
        expired += 1;
      } else if (st === 'active' && !l.end_date) {
        periodic += 1;
      } else if (st === 'active') {
        active += 1;
      } else {
        draft += 1;
      }
    });

    const total = active + periodic + draft + expired + renewed || filtered.length || 0;
    const baseTotal = total === 0 ? 1 : total;

    const healthItems: LeaseHealthItem[] = [
      {
        label: 'Active',
        statusKey: 'active',
        count: active,
        percentage: Math.round((active / baseTotal) * 100),
        color: '#008F83', // Brand Teal
      },
      {
        label: 'Periodic',
        statusKey: 'periodic',
        count: periodic,
        percentage: Math.round((periodic / baseTotal) * 100),
        color: '#0284C7', // Sky Blue
      },
      {
        label: 'Draft',
        statusKey: 'draft',
        count: draft,
        percentage: Math.round((draft / baseTotal) * 100),
        color: '#6366F1', // Indigo
      },
      {
        label: 'Expired',
        statusKey: 'expired',
        count: expired,
        percentage: Math.round((expired / baseTotal) * 100),
        color: '#EF4444', // Red
      },
      {
        label: 'Renewed',
        statusKey: 'renewed',
        count: renewed,
        percentage: Math.round((renewed / baseTotal) * 100),
        color: '#8B5CF6', // Purple
      },
    ];

    // SVG segment calculations
    const radius = 50;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const visibleItems = healthItems.filter((i) => i.count > 0);
    const gap = visibleItems.length > 1 ? 6 : 0;

    let accumulated = 0;
    const sliceData = healthItems.map((item) => {
      if (total === 0 || item.count === 0) {
        return { ...item, strokeDasharray: '0 9999', strokeDashoffset: 0 };
      }
      const rawLength = (item.count / total) * circumference;
      const strokeLength = Math.max(0, rawLength - gap);
      const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
      const strokeDashoffset = -accumulated;
      accumulated += rawLength;
      return { ...item, strokeDasharray, strokeDashoffset };
    });

    return {
      slices: sliceData,
      totalLeases: total,
      items: healthItems,
    };
  }, [leases, selectedPropertyId]);

  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between',
        className
      )}
    >
      <div>
        {/* Header & Property Selector */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
          <h3 className="text-sm sm:text-base font-heading font-bold text-slate-900 dark:text-white">
            Lease Health
          </h3>

          {properties && properties.length > 0 && onPropertySelect && (
            <div className="relative">
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => onPropertySelect(e.target.value || null)}
                className="appearance-none pl-2.5 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-[#17283A] text-xs font-semibold text-slate-700 dark:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#008F83] cursor-pointer"
              >
                <option value="">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Content: Donut + Legend */}
        <div className="flex flex-row items-center justify-between gap-4 sm:gap-6 pt-4">
          {/* Donut Chart */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
            {isLoading ? (
              <div className="w-28 h-28 rounded-full border-4 border-slate-100 dark:border-slate-800 animate-pulse" />
            ) : (
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
                <circle
                  cx="65"
                  cy="65"
                  r="50"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="14"
                  fill="transparent"
                />
                {totalLeases > 0 &&
                  slices.map((slice) =>
                    slice.count > 0 ? (
                      <circle
                        key={slice.label}
                        cx="65"
                        cy="65"
                        r="50"
                        stroke={slice.color}
                        strokeWidth="14"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    ) : null
                  )}
              </svg>
            )}

            {/* Donut Center Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                {isLoading ? '—' : totalLeases}
              </span>
              <span className="text-xs text-slate-500 dark:text-[#7F8B99] font-medium leading-none mt-1">
                Total Leases
              </span>
            </div>
          </div>

          {/* Legend Details */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs sm:text-[13px] py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 tabular-nums font-semibold text-slate-900 dark:text-white text-xs sm:text-[13px]">
                  <span>{item.count}</span>
                  <span className="w-8 text-right text-slate-400 dark:text-[#7F8B99] text-xs font-normal">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
