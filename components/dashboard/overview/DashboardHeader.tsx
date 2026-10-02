'use client';

import React from 'react';
import { RefreshCw, Plus, DollarSign, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/admin/ui/Button';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  selectedProperty?: { propertyName: string; propertyId: string } | null;
  totalPropertiesCount: number;
  lastUpdatedText: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNewLease: () => void;
}

export function DashboardHeader({
  selectedProperty,
  totalPropertiesCount,
  lastUpdatedText,
  isRefreshing,
  onRefresh,
  onNewLease,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
      <div>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-slate-900 dark:text-white">
          {selectedProperty ? selectedProperty.propertyName : 'Dashboard'}
        </h1>
        <div className="flex items-center gap-2.5 mt-1.5 text-slate-500 dark:text-[#94A3B8] text-xs sm:text-sm">
          <span>
            {selectedProperty
              ? 'Property overview and financial performance'
              : 'Portfolio overview and financial performance'}
          </span>
          <span className="text-slate-300 dark:text-[#1E293B] select-none">·</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#7F8B99] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw className={cn('w-3 h-3 text-[#008F83] dark:text-[#32D5C4]', isRefreshing && 'animate-spin')} />
            <span>{isRefreshing ? 'Refreshing…' : `Updated ${lastUpdatedText}`}</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          href="/dashboard/money?action=record"
          className="font-medium text-xs rounded-xl border-slate-200/80 dark:border-[#17283A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0E1E33] shadow-none px-3.5 py-2"
          leftIcon={<DollarSign className="w-3.5 h-3.5 text-[#008F83] dark:text-[#32D5C4]" />}
        >
          Record payment
        </Button>
        <Button
          size="sm"
          onClick={onNewLease}
          className="font-semibold text-xs rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New lease
        </Button>
      </div>
    </div>
  );
}
