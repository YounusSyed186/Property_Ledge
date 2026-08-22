'use client';

import React from 'react';
import { SubscriptionPlan } from '@/types/subscriptions';
import { Check, Zap } from 'lucide-react';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currentPlanSlug?: string;
  onSelectPlan?: (plan: SubscriptionPlan) => void;
  isPopular?: boolean;
}

export function PlanCard({ plan, currentPlanSlug, onSelectPlan, isPopular }: PlanCardProps) {
  const isCurrentPlan = currentPlanSlug === plan.slug;
  const formattedPrice = plan.price_cents === 0 ? 'Free' : `$${(plan.price_cents / 100).toFixed(2)}`;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        isPopular
          ? 'border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-600 ring-opacity-50'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
          Most Popular
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
      </div>

      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{formattedPrice}</span>
        {plan.price_cents > 0 && (
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/{plan.billing_interval}</span>
        )}
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={() => onSelectPlan?.(plan)}
          disabled={isCurrentPlan}
          className={`w-full rounded-xl py-3 px-4 text-center text-sm font-semibold transition-all duration-200 ${
            isCurrentPlan
              ? 'bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-400'
              : isPopular
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/25'
              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
          }`}
        >
          {isCurrentPlan ? 'Current Plan' : plan.price_cents === 0 ? 'Get Started' : 'Select Plan'}
        </button>
      </div>
    </div>
  );
}
