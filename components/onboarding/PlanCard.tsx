'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/admin/ui/Button';

export interface PlanCardData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price_cents: number;
  billing_interval?: string | null;
  features?: string[];
}

interface PlanCardProps {
  plan: PlanCardData;
  selected?: boolean;
  recommended?: boolean;
  onSelect: () => void;
  loading?: boolean;
}

function formatPrice(cents: number, interval?: string | null) {
  if (cents === 0) return { amount: '$0', period: '/ month' };
  const amount = `$${(cents / 100).toFixed(0)}`;
  const period = interval === 'yearly' ? '/ year' : '/ month';
  return { amount, period };
}

export function PlanCard({ plan, selected, recommended, onSelect, loading }: PlanCardProps) {
  const { amount, period } = formatPrice(plan.price_cents, plan.billing_interval);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border p-5 transition-all duration-150',
        selected
          ? 'border-admin-success bg-admin-success-soft'
          : 'border-admin-border bg-admin-surface hover:border-admin-border-subtle'
      )}
    >
      {recommended && (
        <span className="absolute -top-2.5 left-4 rounded-md bg-admin-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Recommended
        </span>
      )}
      <h3 className="text-sm font-semibold text-admin-foreground">{plan.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-admin-foreground">{amount}</span>
        <span className="text-xs text-admin-muted">{period}</span>
      </div>
      {plan.description && <p className="mt-2 text-xs text-admin-muted">{plan.description}</p>}
      {plan.features && plan.features.length > 0 && (
        <ul className="mt-4 flex-1 space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-admin-muted">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-admin-success" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant={selected ? 'primary' : 'secondary'}
        className="mt-5 w-full"
        onClick={onSelect}
        loading={loading}
        rightIcon={selected ? <Check className="h-3.5 w-3.5" /> : undefined}
      >
        {selected ? 'Selected' : 'Select'}
      </Button>
    </div>
  );
}
