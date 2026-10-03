'use client';

import React from 'react';
import { FileText, Calendar, DollarSign, Clock, RefreshCw, TrendingUp, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaseCommandCenterProps {
  activeLeasesCount: number;
  monthlyRentInflow: number;
  expiringSoonCount: number;
  periodicLeasesCount: number;
  isLoading?: boolean;
  className?: string;
}

export function LeaseCommandCenter({
  activeLeasesCount,
  monthlyRentInflow,
  expiringSoonCount,
  periodicLeasesCount,
  isLoading = false,
  className,
}: LeaseCommandCenterProps) {
  return (
    <div
      style={{
        background:
          'radial-gradient(circle at 15% 50%, rgba(255, 255, 255, 0.12), transparent 45%), linear-gradient(120deg, #007F78 0%, #009B91 48%, #008F83 100%)',
      }}
      className={cn(
        'rounded-[24px] border border-teal-600/30 dark:border-teal-500/20 p-4 sm:p-5 lg:p-6 shadow-[0_4px_20px_rgba(0,143,131,0.16)] overflow-hidden relative text-white',
        className
      )}
    >
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 xl:gap-8 relative z-10">
        {/* ZONE 1 (LEFT): Hero Graphic (Contract + Calendar + Dollar Illustration) */}
        <div className="relative w-full sm:w-[240px] xl:w-[250px] h-36 sm:h-40 xl:h-[136px] rounded-[20px] overflow-hidden shrink-0 border border-white/15 shadow-inner bg-white/10 dark:bg-black/20 backdrop-blur-xs flex items-center justify-center p-3 select-none">
          {/* Stylized Vector Illustration */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Contract Document */}
            <div className="absolute left-2 top-2 bottom-2 w-28 bg-white dark:bg-[#0B1B2B] rounded-xl shadow-md border border-white/60 dark:border-emerald-500/30 p-2.5 flex flex-col justify-between transform -rotate-3 transition-transform hover:rotate-0 duration-300">
              <div className="space-y-1.5">
                <div className="h-2 w-12 bg-emerald-500/50 dark:bg-emerald-400/40 rounded-full" />
                <div className="h-1.5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-1.5 w-14 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="h-2 w-8 bg-[#008F83]/60 rounded-full" />
                <svg className="w-5 h-3 text-[#008F83]" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 9C5 3 9 11 13 5C17 1 20 8 23 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Calendar Card */}
            <div className="absolute right-3 top-3 w-24 h-24 bg-white dark:bg-[#0D2235] rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700/60 overflow-hidden transform rotate-6 transition-transform hover:rotate-0 duration-300">
              <div className="h-5 bg-[#008F83] flex items-center justify-around px-2">
                <div className="w-1 h-1.5 bg-white/80 rounded-full" />
                <div className="w-1 h-1.5 bg-white/80 rounded-full" />
                <div className="w-1 h-1.5 bg-white/80 rounded-full" />
              </div>
              <div className="p-2 grid grid-cols-3 gap-1">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 rounded-xs',
                      i === 2 ? 'bg-[#008F83]' : 'bg-slate-100 dark:bg-slate-800'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Floating Dollar Badge */}
            <div className="absolute right-1 bottom-1 h-10 w-10 rounded-full bg-white text-[#008F83] flex items-center justify-center font-black shadow-lg border-2 border-[#008F83]/30 transform hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 stroke-[2.8]" />
            </div>
          </div>
        </div>

        {/* ZONE 2 (CENTER): Lease Command Center Title & 4 KPIs */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="mb-3.5">
            <h2 className="text-xl sm:text-[22px] font-heading font-bold text-white tracking-tight">
              Leases
            </h2>
            <p className="text-xs sm:text-[13px] text-white/80 mt-0.5 font-normal">
              Your lease portfolio at a glance
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-0 pt-1">
            {/* Metric 1: Active Leases */}
            <div className="flex items-center gap-3.5 min-w-0 pr-2 sm:pr-4">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-heading text-2xl sm:text-[26px] xl:text-[28px] font-bold tabular-nums text-white leading-tight">
                    {isLoading ? '—' : activeLeasesCount}
                  </p>
                  <span className="inline-flex items-center text-[10.5px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white border border-white/25">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-white block leading-tight truncate mt-1">
                  Active Leases
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-white/75 block leading-none mt-1 truncate font-normal">
                  Currently running
                </span>
              </div>
            </div>

            {/* Metric 2: Monthly Rent Inflow */}
            <div className="flex items-center gap-3.5 min-w-0 md:border-l md:border-white/15 md:pl-4 sm:md:pl-5 pr-2 sm:pr-4">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-heading text-2xl sm:text-[26px] xl:text-[28px] font-bold tabular-nums text-white leading-tight">
                    {isLoading ? '—' : `$${monthlyRentInflow.toLocaleString()}`}
                  </p>
                  <span className="inline-flex items-center text-[10.5px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white border border-white/25">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-white block leading-tight truncate mt-1">
                  Monthly Rent Inflow
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-white/75 block leading-none mt-1 truncate font-normal">
                  From active leases
                </span>
              </div>
            </div>

            {/* Metric 3: Expiring Soon */}
            <div className="flex items-center gap-3.5 min-w-0 md:border-l md:border-white/15 md:pl-4 sm:md:pl-5 pr-2 sm:pr-4">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl sm:text-[26px] xl:text-[28px] font-bold tabular-nums text-white leading-tight">
                  {isLoading ? '—' : expiringSoonCount}
                </p>
                <span className="text-xs sm:text-[13px] font-semibold text-white block leading-tight truncate mt-1">
                  Expiring Soon
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-white/75 block leading-none mt-1 truncate font-normal">
                  Next 3 months
                </span>
              </div>
            </div>

            {/* Metric 4: Periodic Leases */}
            <div className="flex items-center gap-3.5 min-w-0 md:border-l md:border-white/15 md:pl-4 sm:md:pl-5">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl sm:text-[26px] xl:text-[28px] font-bold tabular-nums text-white leading-tight">
                  {isLoading ? '—' : periodicLeasesCount}
                </p>
                <span className="text-xs sm:text-[13px] font-semibold text-white block leading-tight truncate mt-1">
                  Periodic Leases
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-white/75 block leading-none mt-1 truncate font-normal">
                  Month-to-month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE 3 (RIGHT): Portfolio Status Highlight Card */}
        <div className="w-full xl:w-[260px] rounded-[18px] bg-white/10 dark:bg-black/25 backdrop-blur-xs border border-white/18 p-4 flex items-start gap-3.5 shrink-0 text-white">
          <div className="h-9 w-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/25">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Stable Lease Portfolio
            </h4>
            <p className="text-[11.5px] sm:text-xs text-white/85 mt-1 leading-relaxed font-normal">
              Your leases are in good shape. Stay on top of upcoming dates and renewals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
