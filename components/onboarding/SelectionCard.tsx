'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionCardProps {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  name: string;
}

export function SelectionCard({
  id,
  title,
  description,
  icon,
  selected,
  onSelect,
  name,
}: SelectionCardProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-all duration-150',
        selected
          ? 'border-admin-success bg-admin-success-soft'
          : 'border-admin-border bg-admin-surface hover:border-admin-border-subtle'
      )}
    >
      <input
        type="radio"
        id={id}
        name={name}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <div
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-admin-success bg-admin-success text-white' : 'border-admin-border'
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>
      {icon && (
        <div className={cn('shrink-0', selected ? 'text-admin-success' : 'text-admin-muted')}>{icon}</div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-admin-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-admin-muted">{description}</p>
      </div>
    </label>
  );
}
