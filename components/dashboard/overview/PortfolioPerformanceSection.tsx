'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/format/currency';
import type { UserPropertyAccess } from '@/lib/properties/queries';
import { PortfolioPatternPieChart } from './PortfolioPatternPieChart';
import { cn } from '@/lib/utils';

export interface PropertyPerformanceItem {
  propertyId: string;
  propertyName: string;
  address?: string;
  category?: string;
  isOccupied: boolean;
  activeLeases: number;
  monthlyRent: number;
  income: number;
  expenses: number;
  netCashFlow: number;
}

interface PortfolioPerformanceSectionProps {
  properties: UserPropertyAccess[];
  propertyBreakdown?: PropertyPerformanceItem[];
  occupancyRate?: number;
  categoryBreakdown?: {
    residential: number;
    commercial: number;
    total: number;
  };
  activeLeasesCount?: number;
  activeTenantsCount?: number;
  selectedProperty?: UserPropertyAccess | null;
  className?: string;
}

export function PortfolioPerformanceSection({
  properties,
  propertyBreakdown = [],
  occupancyRate = 0,
  categoryBreakdown = { residential: 0, commercial: 0, total: 0 },
  activeLeasesCount = 0,
  activeTenantsCount = 0,
  selectedProperty,
  className,
}: PortfolioPerformanceSectionProps) {
  const displayProperties: PropertyPerformanceItem[] =
    propertyBreakdown.length > 0
      ? propertyBreakdown
      : properties.map((p) => ({
          propertyId: p.propertyId,
          propertyName: p.propertyName,
          address: p.organizationName || '',
          category: 'Residential',
          isOccupied: true,
          activeLeases: 1,
          monthlyRent: 0,
          income: 0,
          expenses: 0,
          netCashFlow: 0,
        }));

  const totalProps = categoryBreakdown.total || properties.length || 1;
  const resPercentage = Math.round((categoryBreakdown.residential / totalProps) * 100) || 100;
  const comPercentage = 100 - resPercentage;
  const vacantRate = Math.max(0, 100 - occupancyRate);

  // SVG Circular Gauge calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (occupancyRate / 100) * circumference;

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch', className)}>
      {/* LEFT (8 COLS / ~68%): Editorial Property Performance List */}
      <div className="lg:col-span-8 rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-6 lg:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3">
            <div>
              <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
                {selectedProperty ? 'Property performance' : 'Properties'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-[#7F8B99] mt-0.5">
                Occupancy, revenue collections, and net yield
              </p>
            </div>

            <Link
              href="/dashboard/properties"
              className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline inline-flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          {/* Editorial Property Rows */}
          <div className="mt-3 divide-y divide-slate-100 dark:divide-[#17283A]/60">
            {displayProperties.slice(0, 5).map((prop) => {
              const isPositive = prop.netCashFlow >= 0;

              return (
                <div
                  key={prop.propertyId}
                  className="py-3.5 first:pt-2 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Property Info & Occupancy */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#0E1E33] text-slate-700 dark:text-[#94A3B8] group-hover:text-[#008F83] dark:group-hover:text-[#32D5C4] group-hover:bg-[#008F83]/10 dark:group-hover:bg-[#32D5C4]/10 transition-colors flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/properties/${prop.propertyId}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-[#008F83] dark:hover:text-[#32D5C4] transition-colors text-sm truncate block"
                      >
                        {prop.propertyName}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            prop.isOccupied
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {prop.isOccupied ? '100% occupied' : 'Vacant'}
                        </span>
                        {prop.address && (
                          <>
                            <span className="text-slate-300 dark:text-[#1E293B]">·</span>
                            <span className="text-[11px] text-slate-400 dark:text-[#7F8B99] truncate max-w-[160px] sm:max-w-xs">
                              {prop.address}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics in Clean Minimalist Flow */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 pl-12 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-slate-400 dark:text-[#7F8B99]">Income</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatCurrencyNoDecimals(prop.income)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-slate-400 dark:text-[#7F8B99]">Expenses</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-[#7F8B99] tabular-nums">
                        {formatCurrencyNoDecimals(prop.expenses)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right min-w-[70px]">
                      <p className="text-[11px] text-slate-400 dark:text-[#7F8B99]">Net</p>
                      <p
                        className={cn(
                          'text-xs font-bold tabular-nums',
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {formatCurrencyNoDecimals(prop.netCashFlow)}
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/properties/${prop.propertyId}`}
                      className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                      title="View property details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#17283A]/80 flex items-center justify-between text-xs text-slate-500 dark:text-[#7F8B99]">
          <span>
            {displayProperties.length} {displayProperties.length === 1 ? 'property' : 'properties'} in portfolio
          </span>
          <Link
            href="/dashboard/properties"
            className="font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline"
          >
            All properties →
          </Link>
        </div>
      </div>

      {/* RIGHT (4 COLS / ~32%): Visual Pattern Pie Chart & Portfolio Mix */}
      <div className="lg:col-span-4 flex flex-col justify-between">
        <PortfolioPatternPieChart
          occupancyRate={occupancyRate}
          residentialCount={categoryBreakdown.residential}
          commercialCount={categoryBreakdown.commercial}
          totalProperties={properties.length}
          className="h-full flex flex-col justify-between"
        />
      </div>
    </div>
  );
}
