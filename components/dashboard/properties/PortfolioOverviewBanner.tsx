'use client';

import React from 'react';
import Image from 'next/image';
import { Home, CheckCircle2, Users, DoorOpen, Plus } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface PortfolioOverviewBannerProps {
  totalProperties: number;
  activeProperties: number;
  tenantedProperties: number;
  vacantProperties: number;
  isLoading?: boolean;
  onAddProperty: () => void;
  className?: string;
}

export function PortfolioOverviewBanner({
  totalProperties,
  activeProperties,
  tenantedProperties,
  vacantProperties,
  isLoading = false,
  onAddProperty,
  className,
}: PortfolioOverviewBannerProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-4 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none overflow-hidden relative',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 lg:gap-8">
        {/* LEFT: Generous Architectural Visual with Floating Glass/White Pill */}
        <div className="relative w-full lg:w-[340px] xl:w-[360px] h-52 sm:h-56 lg:h-[220px] rounded-[20px] overflow-hidden shrink-0 group border border-slate-200/80 dark:border-[#17283A] shadow-xs">
          <Image
            src="/images/property_banner_visual.jpg"
            alt="Property Portfolio Visual"
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

          {/* Floating Pill Card Matching Mockup */}
          <div className="absolute bottom-3.5 left-3.5 px-4 py-3 rounded-[16px] bg-white/95 dark:bg-[#07111F]/95 backdrop-blur-md border border-slate-200/80 dark:border-[#17283A] shadow-md min-w-[160px]">
            <span className="text-[11px] font-bold text-slate-700 dark:text-[#94A3B8] block leading-none tracking-tight">
              Your Portfolio
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="font-heading text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white leading-none">
                {isLoading ? '—' : totalProperties}
              </span>
              <span className="text-xs text-slate-600 dark:text-[#94A3B8] font-semibold leading-none">
                {totalProperties === 1 ? 'Property' : 'Properties'}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: Portfolio Overview Metrics */}
        <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
          <div className="mb-4">
            <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
              Portfolio Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#7F8B99] mt-0.5">
              A snapshot of your property portfolio across all locations.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 xl:gap-6 pt-2">
            {/* Metric 1: Total Properties */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#E8F1FD] text-[#2563EB] dark:bg-blue-500/15 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-500/20 shadow-xs">
                <Home className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : totalProperties}
                </p>
                <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-medium">
                  Total Properties
                </span>
              </div>
            </div>

            {/* Metric 2: Active Properties */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#E6F8F3] text-[#008F83] dark:bg-emerald-500/15 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-500/20 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : activeProperties}
                </p>
                <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-medium">
                  Active Properties
                </span>
              </div>
            </div>

            {/* Metric 3: Tenanted Properties */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#E8F3FD] text-[#0284C7] dark:bg-sky-500/15 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/60 dark:border-sky-500/20 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : tenantedProperties}
                </p>
                <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-medium">
                  Tenanted
                </span>
              </div>
            </div>

            {/* Metric 4: Vacant Properties */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#F3EDFD] text-[#7C3AED] dark:bg-purple-500/15 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-500/20 shadow-xs">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
                  {isLoading ? '—' : vacantProperties}
                </p>
                <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-medium">
                  Vacant
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Contextual Action Panel with Skyline Silhouette Accent */}
        <div className="w-full lg:w-72 xl:w-80 p-5 sm:p-6 rounded-[20px] bg-slate-50/70 dark:bg-[#0B1726]/70 border border-slate-200/70 dark:border-[#17283A] shrink-0 flex flex-col justify-between relative overflow-hidden min-h-[170px] lg:min-h-[200px]">
          {/* Subtle Skyline Vector Accent in Background */}
          <svg
            className="absolute right-0 bottom-0 w-44 h-32 opacity-20 dark:opacity-10 pointer-events-none text-slate-600 dark:text-slate-300"
            viewBox="0 0 160 110"
            fill="currentColor"
          >
            <rect x="10" y="45" width="18" height="65" rx="1" />
            <rect x="32" y="25" width="24" height="85" rx="1" />
            <rect x="60" y="55" width="20" height="55" rx="1" />
            <rect x="85" y="15" width="28" height="95" rx="1" />
            <rect x="118" y="38" width="22" height="72" rx="1" />
            <rect x="144" y="60" width="16" height="50" rx="1" />
          </svg>

          <div className="relative z-10">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              Keep building <br /> your portfolio
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#7F8B99] mt-1.5 leading-relaxed">
              Add more properties to get richer insights and reports.
            </p>
          </div>

          <div className="mt-4 relative z-10">
            <Button
              onClick={onAddProperty}
              size="sm"
              className="w-full font-bold text-xs rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none justify-center py-2.5"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Property
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
