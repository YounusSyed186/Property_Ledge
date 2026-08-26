'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingLoadingOverlayProps {
  message?: string;
  className?: string;
}

export function OnboardingLoadingOverlay({
  message = 'Loading next step…',
  className,
}: OnboardingLoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-admin-background/80 backdrop-blur-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="h-8 w-8 rounded-full border-2 border-admin-success border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-admin-muted">{message}</p>
    </div>
  );
}
