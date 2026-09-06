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
        'absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/85 dark:bg-[#071014]/90 backdrop-blur-md transition-all select-none p-4',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-subtle/90 border border-border flex items-center justify-center p-2.5 shadow-md shadow-accent/10">
          <img
            src="/logo_Light.png"
            alt="PropertyLedge"
            className="w-full h-full object-contain dark:hidden animate-pulse"
          />
          <img
            src="/logo_Dark.png"
            alt="PropertyLedge"
            className="w-full h-full object-contain hidden dark:block animate-pulse"
          />
        </div>
        <div className="absolute -inset-1.5 rounded-2xl bg-accent/20 blur-md -z-10 animate-pulse" />
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="font-heading text-xs font-bold text-foreground">
          PropertyLedge<span className="text-accent font-normal">.com.au</span>
        </span>
        <p className="text-xs font-medium text-muted">{message}</p>
      </div>

      <div className="w-28 h-1 rounded-full bg-surface-subtle overflow-hidden border border-border/40">
        <div
          className="h-full bg-gradient-to-r from-accent via-emerald-400 to-accent rounded-full animate-[shimmer_1.5s_infinite_linear]"
          style={{ width: '100%', backgroundSize: '200% 100%' }}
        />
      </div>
    </div>
  );
}
