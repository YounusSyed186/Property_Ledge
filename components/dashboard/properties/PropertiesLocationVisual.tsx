'use client';

import React, { useMemo } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertiesLocationVisualProps {
  properties: Record<string, unknown>[];
  isLoading?: boolean;
  className?: string;
}

export function PropertiesLocationVisual({
  properties = [],
  isLoading = false,
  className,
}: PropertiesLocationVisualProps) {
  // Derive states breakdown
  const stateBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    properties.forEach((p) => {
      const state = String(p.state || '').trim() || 'TAS';
      map.set(state, (map.get(state) || 0) + 1);
    });

    const total = properties.length || 1;
    const items: Array<{ state: string; count: number; percentage: number }> = [];
    map.forEach((count, state) => {
      items.push({
        state,
        count,
        percentage: Math.round((count / total) * 100),
      });
    });
    return items.sort((a, b) => b.count - a.count);
  }, [properties]);

  // Derive top locations (city / suburb)
  const topLocations = useMemo(() => {
    const map = new Map<string, number>();
    properties.forEach((p) => {
      const loc = String(p.suburb || p.city || p.address_line_1 || '').trim() || 'Hyderabad';
      map.set(loc, (map.get(loc) || 0) + 1);
    });

    const items: Array<{ name: string; count: number }> = [];
    map.forEach((count, name) => {
      items.push({ name, count });
    });
    return items.sort((a, b) => b.count - a.count).slice(0, 4);
  }, [properties]);

  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between relative overflow-hidden',
        className
      )}
    >
      <div>
        {/* Header with Coming Soon Badge */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
          <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">
            Property Locations
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
            Coming Soon
          </span>
        </div>

        {/* Relative Container with Frosted Glass Blur Overlay */}
        <div className="relative mt-4 rounded-2xl overflow-hidden">
          {/* Underlying Map & Stats (Blurred) */}
          <div className="filter blur-[3.5px] opacity-75 pointer-events-none select-none transition-all">
            {/* Realistic Styled Geographic Map Canvas */}
            <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-[#D8EAF8] dark:bg-[#0A1829] border border-sky-200/70 dark:border-[#17283A]/60 flex items-center justify-center shadow-inner">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice">
                <path
                  d="M-20,20 Q40,30 90,60 T180,40 T280,70 T380,30 L380,180 L-20,180 Z"
                  fill="#EBF4FC"
                  className="dark:fill-[#0E2238]"
                />
                <path
                  d="M30,10 Q100,5 160,35 Q220,10 320,40 L380,20 L380,160 L30,160 Z"
                  fill="#F4F9FD"
                  className="dark:fill-[#122A44]"
                  opacity="0.8"
                />
                <path
                  d="M100,20 L130,70 M180,30 L190,90 M260,30 L250,80"
                  stroke="#CBDCEB"
                  strokeWidth="0.75"
                  strokeDasharray="2,2"
                  className="dark:stroke-[#1B3858]"
                />
                <text x="70" y="50" fontSize="8" fill="#94A3B8" fontWeight="600" letterSpacing="0.5">MAHARASHTRA</text>
                <text x="180" y="45" fontSize="8" fill="#94A3B8" fontWeight="600" letterSpacing="0.5">CHHATTISGARH</text>
                <text x="290" y="55" fontSize="8" fill="#94A3B8" fontWeight="600" letterSpacing="0.5">ODISHA</text>
              </svg>

              {/* Map Controls (+ / -) */}
              <div className="absolute top-2.5 left-2.5 flex flex-col rounded-lg bg-white/95 dark:bg-[#07111F]/95 backdrop-blur-xs border border-slate-200/80 dark:border-[#17283A] shadow-xs overflow-hidden z-20">
                <span className="px-1.5 py-1 text-slate-700 dark:text-slate-300 font-bold text-xs">+</span>
                <div className="h-px bg-slate-200 dark:bg-[#17283A]" />
                <span className="px-1.5 py-1 text-slate-700 dark:text-slate-300 font-bold text-xs">−</span>
              </div>

              {/* Central Pinned Location Node */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight mb-0.5">
                  Hyderabad
                </span>
                <div className="relative flex items-center justify-center">
                  <span className="h-4 w-4 rounded-full bg-[#008F83] border-2 border-white shadow-md flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Hyderabad
                </span>
              </div>
            </div>

            {/* Bottom Section: Two Parallel Columns */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {/* Column 1: Properties by State */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Properties by State
                </span>

                <div className="space-y-2">
                  {stateBreakdown.slice(0, 2).map((item) => (
                    <div key={item.state} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
                        {item.state}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-[#0E1E33] overflow-hidden">
                          <div
                            style={{ width: `${item.percentage}%` }}
                            className="h-full rounded-full bg-blue-500"
                          />
                        </div>
                        <span className="text-slate-900 dark:text-white font-bold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Top Locations */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Top Locations
                </span>

                <div className="space-y-2">
                  {topLocations.slice(0, 2).map((loc) => (
                    <div key={loc.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#008F83] dark:text-[#32D5C4] shrink-0" />
                        <span className="truncate">{loc.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0 ml-1">
                        {loc.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Frosted Glass Overlay Badge */}
          <div className="absolute inset-0 bg-white/45 dark:bg-[#07111F]/55 backdrop-blur-[4px] rounded-2xl flex flex-col items-center justify-center p-5 z-30 text-center border border-slate-200/50 dark:border-[#17283A]/50">
            <div className="h-11 w-11 rounded-2xl bg-white dark:bg-[#0E1E33] shadow-md border border-slate-200/80 dark:border-[#17283A] flex items-center justify-center text-[#008F83] dark:text-[#32D5C4] mb-2.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#008F83] text-white shadow-xs">
              Coming Soon
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium max-w-[210px] mt-2 leading-relaxed">
              Geographic analytics and live property mapping are in active development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
