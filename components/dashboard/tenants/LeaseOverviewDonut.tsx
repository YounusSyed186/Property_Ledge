'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaseOverviewItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LeaseOverviewDonutProps {
  tenants: Array<{
    id: string;
    property_id?: string;
    status?: string;
    lease_tenants?: Array<{
      lease?: {
        id: string;
        status: string;
        end_date: string | null;
      } | null;
    }>;
  }>;
  properties?: Array<{ id: string; name: string }>;
  selectedPropertyId?: string | null;
  onPropertySelect?: (id: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

export function LeaseOverviewDonut({
  tenants = [],
  properties = [],
  selectedPropertyId = null,
  onPropertySelect,
  isLoading = false,
  className,
}: LeaseOverviewDonutProps) {
  // Derive lease metrics
  const { slices, totalActive, totalEvaluated } = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let noLease = 0;

    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    tenants.forEach((t) => {
      const activeLease = t.lease_tenants?.find((lt) => lt.lease?.status === 'active')?.lease || t.lease_tenants?.[0]?.lease;

      if (!activeLease || activeLease.status !== 'active') {
        noLease += 1;
      } else {
        if (activeLease.end_date) {
          const endDate = new Date(activeLease.end_date);
          if (endDate >= now && endDate <= sixtyDaysFromNow) {
            expiringSoon += 1;
          } else {
            active += 1;
          }
        } else {
          active += 1;
        }
      }
    });

    const total = active + expiringSoon + noLease || 1;
    const items: LeaseOverviewItem[] = [
      {
        label: 'Active Leases',
        count: active,
        percentage: Math.round((active / total) * 100),
        color: '#009B91', // Brand teal
      },
      {
        label: 'Expiring Soon',
        count: expiringSoon,
        percentage: Math.round((expiringSoon / total) * 100),
        color: '#F59E0B', // Amber
      },
      {
        label: 'No Active Lease',
        count: noLease,
        percentage: Math.round((noLease / total) * 100),
        color: '#071526', // Navy
      },
    ];

    // SVG segment calculations
    const radius = 52;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const visibleItems = items.filter((i) => i.count > 0);
    const gap = visibleItems.length > 1 ? 6 : 0;

    let accumulated = 0;
    const sliceData = items.map((item) => {
      const rawLength = (item.percentage / 100) * circumference;
      const strokeLength = Math.max(0, rawLength - gap);
      const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
      const strokeDashoffset = -((accumulated / 100) * circumference + gap / 2);
      accumulated += item.percentage;
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return {
      slices: sliceData,
      totalActive: active + expiringSoon,
      totalEvaluated: tenants.length,
    };
  }, [tenants]);

  const radius = 52;
  const strokeWidth = 14;

  return (
    <div
      className={cn(
        'rounded-[20px] sm:rounded-[24px] border border-[#E1E8EF] dark:border-[#17283A] bg-white dark:bg-[#07111F] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between',
        className
      )}
    >
      <div>
        {/* Header with Property Selector */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
          <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">
            Lease Overview
          </h3>

          <div className="relative">
            <select
              value={selectedPropertyId || ''}
              onChange={(e) => onPropertySelect?.(e.target.value ? e.target.value : null)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-[#17283A] text-xs font-semibold text-slate-700 dark:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#008F83] cursor-pointer max-w-[140px] truncate"
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
        </div>

        {/* Donut Chart Visualization */}
        <div className="mt-5 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="w-36 h-36 rounded-full border-4 border-slate-100 dark:border-slate-800 animate-pulse flex items-center justify-center" />
          ) : totalEvaluated === 0 ? (
            <div className="h-36 flex items-center justify-center text-xs text-slate-400">
              No tenants recorded
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-2">
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  {/* Background Ring */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    className="text-slate-100/80 dark:text-[#0E1E33]"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                  />

                  {/* Slices with clean gap and rounded linecap */}
                  {slices.map((slice, idx) => (
                    <circle
                      key={slice.label || idx}
                      cx="70"
                      cy="70"
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  ))}
                </svg>

                {/* Center Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                    {totalActive}
                  </span>
                  <span className="text-[11px] sm:text-[11.5px] font-semibold text-slate-500 dark:text-[#7F8B99] mt-1">
                    Active Leases
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Legend Items */}
          <div className="mt-4 w-full flex flex-col gap-2">
            {slices.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-[#0E1E33]/60 border border-slate-200/50 dark:border-[#17283A] hover:bg-slate-100/80 dark:hover:bg-[#0E1E33] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs sm:text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs sm:text-[12.5px] font-bold text-slate-900 dark:text-white tabular-nums">
                    {item.count}
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
