'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingRail } from './OnboardingRail';
import { ProgressIndicator } from './ProgressIndicator';
import { OnboardingLoadingOverlay } from './OnboardingLoadingOverlay';
import { OnboardingNavProvider, useOnboardingNav } from './OnboardingNavContext';
import {
  getProgressStepFromPath,
  getStageByPath,
  type OnboardingStage,
} from '@/lib/onboarding/state';

interface OnboardingShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

function OnboardingShellInner({ children, userName, userEmail }: OnboardingShellProps) {
  const pathname = usePathname();
  const { isNavigating } = useOnboardingNav();

  // Always derive UI step from the current URL so client navigations update immediately
  const currentStage: OnboardingStage = getStageByPath(pathname).id;
  const progress = getProgressStepFromPath(pathname);
  const showProgress = currentStage !== 'welcome';

  return (
    <div className="flex min-h-screen flex-col bg-admin-background font-sans text-admin-foreground">
      <OnboardingHeader userName={userName} userEmail={userEmail} />

      <div className="flex flex-1 min-h-0">
        <OnboardingRail currentStage={currentStage} />

        <div className="flex flex-1 flex-col min-w-0">
          {showProgress && (
            <div className="lg:hidden border-b border-admin-border bg-admin-surface px-4 py-3">
              <ProgressIndicator
                current={progress.current}
                total={progress.total}
                label={progress.label}
              />
            </div>
          )}

          <div className="relative flex flex-1 flex-col min-h-0">
            <main className="flex flex-1 flex-col min-h-0 bg-admin-surface lg:bg-admin-background">
              {showProgress && (
                <div className="hidden lg:block px-10 pt-8">
                  <div className="max-w-[560px]">
                    <ProgressIndicator
                      current={progress.current}
                      total={progress.total}
                      label={progress.label}
                    />
                  </div>
                </div>
              )}
              <div className="relative flex flex-1 flex-col min-h-0">
                {isNavigating && <OnboardingLoadingOverlay />}
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingShell(props: OnboardingShellProps) {
  return (
    <OnboardingNavProvider>
      <OnboardingShellInner {...props} />
    </OnboardingNavProvider>
  );
}
