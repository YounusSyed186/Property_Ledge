'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export function ProgressIndicator({ current, total, label, className }: ProgressIndicatorProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn('space-y-2.5', className)} aria-label={`Step ${current} of ${total}${label ? `: ${label}` : ''}`}>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-admin-muted">
        <span>
          Step {current} of {total}
        </span>
        {label && <span className="text-admin-muted/80 normal-case font-medium">{label}</span>}
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-admin-border/30">
        <motion.div
          className="h-full rounded-full bg-admin-success"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
