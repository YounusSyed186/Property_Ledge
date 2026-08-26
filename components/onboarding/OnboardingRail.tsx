'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PROGRESS_STAGES, type OnboardingStage } from '@/lib/onboarding/state';

interface OnboardingRailProps {
  currentStage: OnboardingStage;
}

export function OnboardingRail({ currentStage }: OnboardingRailProps) {
  const currentIndex = PROGRESS_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col justify-between bg-admin-sidebar-surface border-r border-admin-sidebar-border px-8 py-10">
      <div className="space-y-8">
        <div>
          <p className="font-heading text-lg font-bold text-admin-sidebar-foreground">PropertyLedge</p>
          <p className="mt-3 text-sm leading-relaxed text-admin-sidebar-muted">
            Get your property management workspace ready.
          </p>
        </div>

        <nav aria-label="Setup progress" className="space-y-1">
          {PROGRESS_STAGES.map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = stage.id === currentStage;
            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isCurrent && 'text-admin-sidebar-foreground',
                  isComplete && 'text-admin-sidebar-muted',
                  !isCurrent && !isComplete && 'text-admin-sidebar-muted/60'
                )}
              >
                <span
                  className={cn(
                    'flex h-2 w-2 shrink-0 rounded-full',
                    isComplete && 'bg-admin-success',
                    isCurrent && 'bg-admin-success ring-4 ring-admin-success/20',
                    !isComplete && !isCurrent && 'bg-admin-sidebar-border'
                  )}
                  aria-hidden
                />
                <span className={cn(isCurrent && 'font-medium')}>{stage.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      <p className="text-xs leading-relaxed text-admin-sidebar-muted">
        Your information is secure. You can change these settings later.
      </p>
    </aside>
  );
}
