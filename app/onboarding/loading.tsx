import React from 'react';
import { OnboardingLoadingOverlay } from '@/components/onboarding/OnboardingLoadingOverlay';

export default function OnboardingLoading() {
  return (
    <div className="relative flex flex-1 min-h-[320px]">
      <OnboardingLoadingOverlay message="Loading…" />
    </div>
  );
}
