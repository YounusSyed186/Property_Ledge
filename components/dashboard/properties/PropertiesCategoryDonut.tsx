'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryDistributionItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface PropertiesCategoryDonutProps {
  properties: Record<string, unknown>[];
  isLoading?: boolean;
  className?: string;
}

const PALETTE = [
  '#061222', // Deep navy
  '#38BDF8', // Light cyan/sky
  '#008F83', // Brand teal
  '#34D399', // Emerald
  '#A78BFA', // Purple
  '#FBBF24', // Amber
];

export function PropertiesCategoryDonut({
  properties = [],
  isLoading = false,
  className,
}: PropertiesCategoryDonutProps) {
  const [groupBy, setGroupBy] = useState<'type' | 'category'>('type');

  const distribution = useMemo<CategoryDistributionItem[]>(() => {
    if (!properties.length) return [];

    const countsMap = new Map<string, number>();
    properties.forEach((p) => {
      let rawKey: string | undefined;
      if (groupBy === 'category') {
        const cat = String(p.property_category || '').toLowerCase();
        if (cat.includes('comm')) {
          rawKey = 'Commercial';
        } else {
          rawKey = 'Residential';
        }
      } else {
        // Group by Property Type
        const type = String(p.property_type || '').toLowerCase();
        if (type.includes('apartment') || type.includes('multi')) {
          rawKey = 'Apartment';
        } else if (type.includes('house')) {
          rawKey = 'House';
        } else if (type.includes('townhouse')) {
          rawKey = 'Townhouse';
        } else if (type.includes('unit')) {
          rawKey = 'Unit';
        } else if (type.includes('office')) {
          rawKey = 'Office';
        } else if (type.includes('retail')) {
          rawKey = 'Retail';
        } else if (type.includes('warehouse') || type.includes('indus')) {
          rawKey = 'Industrial / Warehouse';
        } else if (p.property_type && String(p.property_type).trim()) {
          rawKey = String(p.property_type).trim();
        } else {
          rawKey = 'Apartment';
        }
      }

      const key = String(rawKey).trim();
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    });

    const total = properties.length;
    let colorIdx = 0;
    const items: CategoryDistributionItem[] = [];

    countsMap.forEach((count, label) => {
      const percentage = Math.round((count / total) * 100);
      items.push({
        label,
        count,
        percentage,
        color: PALETTE[colorIdx % PALETTE.length],
      });
      colorIdx++;
    });

    return items;
  }, [properties, groupBy]);

  const totalCount = properties.length;

  // SVG Donut calculation with clean segment gaps and smooth caps
  const radius = 52;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const gap = distribution.length > 1 ? 8 : 0; // 8px visual gap between slices

  let accumulatedPercent = 0;
  const slices = distribution.map((item) => {
    const rawLength = (item.percentage / 100) * circumference;
    const strokeLength = Math.max(0, rawLength - gap);
    const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference + gap / 2);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between',
        className
      )}
    >
      <div>
        {/* Header with Group Selector */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
          <div>
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">
              Properties by Category
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-[#7F8B99] mt-0.5">
              Portfolio type distribution
            </p>
          </div>

          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'type' | 'category')}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-[#17283A] text-xs font-semibold text-slate-700 dark:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#008F83] cursor-pointer"
            >
              <option value="type">Property Type</option>
              <option value="category">Category</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Donut Chart Visualization */}
        <div className="mt-5 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="w-40 h-40 rounded-full border-4 border-slate-100 dark:border-slate-800 animate-pulse flex items-center justify-center" />
          ) : totalCount === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400">
              No properties to categorize
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-2">
              <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
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
                  <span className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                    {totalCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-[#7F8B99] mt-1">
                    {totalCount === 1 ? 'Property' : 'Properties'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Legend Items with Explicit Visible Percentage Pills */}
          <div className="mt-4 w-full flex flex-col gap-2.5">
            {slices.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0E1E33]/60 border border-slate-200/60 dark:border-[#17283A] hover:bg-slate-100/80 dark:hover:bg-[#0E1E33] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 shadow-xs ring-2 ring-white dark:ring-[#07111F]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                    {item.count} {item.count === 1 ? 'property' : 'properties'}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums border"
                    style={{
                      backgroundColor: item.color === '#061222' ? '#F1F5F9' : `${item.color}18`,
                      borderColor: item.color === '#061222' ? '#E2E8F0' : `${item.color}35`,
                      color: item.color === '#061222' ? '#0F172A' : item.color,
                    }}
                  >
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

