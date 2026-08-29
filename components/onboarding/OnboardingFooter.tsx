'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingFooterProps {
  onBack?: () => void;
  backLabel?: string;
  continueLabel?: string;
  onContinue?: () => void;
  continueType?: 'button' | 'submit';
  continueLoading?: boolean;
  continueDisabled?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
  error?: string | null;
  className?: string;
}

export function OnboardingFooter({
  onBack,
  backLabel = 'Back',
  continueLabel = 'Continue',
  onContinue,
  continueType = 'submit',
  continueLoading = false,
  continueDisabled = false,
  skipLabel,
  onSkip,
  error,
  className,
}: OnboardingFooterProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn('space-y-4 pt-8 border-t border-admin-border/30 mt-8', className)}>
      {error && (
        <p className="text-sm font-medium text-admin-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Back / Skip Actions */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg text-xs font-semibold text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-all cursor-pointer select-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </button>
          )}
          {onSkip && skipLabel && (
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex items-center justify-center h-10 px-3 rounded-lg text-xs font-semibold text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-all cursor-pointer select-none"
            >
              {skipLabel}
            </button>
          )}
        </div>

        {/* Continue Button */}
        <motion.button
          type={continueType}
          onClick={onContinue}
          disabled={continueDisabled || continueLoading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileTap={{ scale: continueDisabled || continueLoading ? 1 : 0.98 }}
          className={cn(
            "inline-flex items-center justify-center gap-2 h-11 px-5 sm:px-6 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer select-none shadow-sm shadow-admin-primary/10",
            continueDisabled || continueLoading
              ? "bg-admin-primary/60 pointer-events-none opacity-80"
              : "bg-admin-primary hover:bg-admin-primary-hover active:bg-admin-primary-hover/90"
          )}
        >
          {continueLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
              <span>{continueLabel}</span>
            </>
          ) : (
            <>
              <span>{continueLabel}</span>
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
      </div>
    </div>
  );
}
