'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/admin/ui/Button';
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
  return (
    <div className={cn('space-y-3 pt-6', className)}>
      {error && (
        <p className="text-sm text-admin-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
              {backLabel}
            </Button>
          )}
          {onSkip && skipLabel && (
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              {skipLabel}
            </Button>
          )}
        </div>
        <Button
          type={continueType}
          variant="primary"
          size="md"
          onClick={onContinue}
          loading={continueLoading}
          disabled={continueDisabled || continueLoading}
          rightIcon={!continueLoading ? <ArrowRight className="h-3.5 w-3.5" /> : undefined}
        >
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
