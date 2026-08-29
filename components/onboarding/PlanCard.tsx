'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      whileHover={{ y: selected ? 0 : -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex flex-col justify-between h-full rounded-2xl border p-6 transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/60 focus-visible:ring-offset-2',
          selected
            ? 'border-admin-primary bg-admin-primary/5 shadow-md shadow-admin-primary/5'
            : 'border-admin-border/60 bg-admin-surface hover:border-admin-border hover:shadow-sm'
        )}
      >
        {recommended && (
          <span className="absolute -top-2.5 left-6 rounded-full bg-admin-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
            Recommended
          </span>
        )}

        <div className="space-y-4">
          {/* Header & Checkmark */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-admin-foreground">{plan.name}</h3>
              {plan.description && <p className="mt-1 text-xs text-admin-muted leading-relaxed">{plan.description}</p>}
            </div>
            
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
                selected ? 'border-admin-primary bg-admin-primary text-white' : 'border-admin-border bg-admin-surface'
              )}
            >
              <AnimatePresence initial={false}>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-3xl font-bold tracking-tight text-admin-foreground">{amount}</span>
            <span className="text-xs font-semibold text-admin-muted">{period}</span>
          </div>

          {/* Features List */}
          {plan.features && plan.features.length > 0 && (
            <ul className="space-y-2 border-t border-admin-border/20 pt-4 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-admin-muted cursor-default">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-admin-success" strokeWidth={2.5} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected Accent border indicator */}
        {selected && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 rounded-b-2xl bg-admin-primary" />
        )}
      </div>
    </motion.div>
  );
}
