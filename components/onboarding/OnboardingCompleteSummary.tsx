'use client';

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { finishOnboarding } from '@/app/actions/onboarding';

interface OnboardingCompleteSummaryProps {
  workspaceName: string;
  hasSubscription: boolean;
  propertyName?: string;
  subscriptionStatus?: string | null;
}

export function OnboardingCompleteSummary({
  workspaceName,
  hasSubscription,
  propertyName,
  subscriptionStatus
}: OnboardingCompleteSummaryProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  const handleDashboardRedirect = () => {
    setError(null);
    startTransition(async () => {
      try {
        await finishOnboarding();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to open dashboard. Please try again.';
        if (!message.includes('NEXT_REDIRECT')) {
          setError(message);
        }
      }
    });
  };

  const checklistItems = [
    {
      label: 'Workspace created',
      value: workspaceName,
      done: true,
    },
    {
      label: 'Plan subscription',
      value: subscriptionStatus === 'trial' ? 'Standard (14d Trial)' : 'Active Plan',
      done: hasSubscription,
    },
    {
      label: 'First property',
      value: propertyName || 'Skipped (Can add later)',
      done: true, // skipped or added is fine for completion
    },
  ];

  return (
    <div className="space-y-8 mt-6">
      {/* Animated Success Checkmark */}
      <div className="flex justify-start">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-admin-success/10 text-admin-success border border-admin-success/20 shadow-sm"
        >
          <Check className="h-6 w-6" strokeWidth={3} />
        </motion.div>
      </div>

      {/* Summary Checklist */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-admin-muted/90 cursor-default">Workspace Summary</h3>
        <div className="space-y-3">
          {checklistItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className="flex items-center justify-between p-3.5 rounded-xl border border-admin-border/50 bg-admin-surface-subtle/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-success/15 text-admin-success">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-xs font-semibold text-admin-foreground/80 tracking-tight cursor-default">{item.label}</span>
              </div>
              <span className="text-xs text-admin-muted font-medium cursor-default">{item.value}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-admin-border/30">
        <motion.button
          onClick={handleDashboardRedirect}
          disabled={isPending}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileTap={{ scale: isPending ? 1 : 0.98 }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg text-xs font-semibold text-white bg-admin-primary hover:bg-admin-primary-hover active:bg-admin-primary-hover/90 transition-colors cursor-pointer select-none shadow-sm shadow-admin-primary/10"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
              <span>Opening PropertyLedge...</span>
            </>
          ) : (
            <>
              <span>Go to dashboard</span>
              <motion.span
                animate={{ x: isHovered ? 3.5 : 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="shrink-0"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            </>
          )}
        </motion.button>
        {error && <p className="mt-3 text-xs font-medium text-admin-danger" role="alert">{error}</p>}
      </div>
    </div>
  );
}
