'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   TABS
   ============================================================ */

interface TabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode; count?: number }[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultValue, value, onChange, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || tabs[0]?.value || '');
  const activeValue = value ?? internalValue;

  const handleChange = (tabValue: string) => {
    if (value === undefined) setInternalValue(tabValue);
    onChange?.(tabValue);
  };

  return (
    <div className={cn('flex items-center gap-1 bg-admin-sidebar-surface p-1 rounded-lg border border-admin-border w-fit', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeValue === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption font-semibold transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/40',
              isActive
                ? 'bg-admin-primary text-black shadow-elevation-1'
                : 'text-admin-muted hover:text-admin-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-black/20 text-black' : 'bg-admin-surface-subtle text-admin-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   SEGMENTED CONTROL
   ============================================================ */

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, defaultValue, onChange, className }: SegmentedControlProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || '');
  const activeValue = value ?? internalValue;

  const handleChange = (optionValue: string) => {
    if (value === undefined) setInternalValue(optionValue);
    onChange?.(optionValue);
  };

  return (
    <div className={cn('flex items-center gap-1 bg-admin-sidebar-surface p-1 rounded-lg border border-admin-border w-fit', className)} role="radiogroup">
      {options.map((option) => {
        const isActive = activeValue === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleChange(option.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-caption font-semibold transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/40',
              isActive
                ? 'bg-admin-primary text-black shadow-elevation-1'
                : 'text-admin-muted hover:text-admin-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}