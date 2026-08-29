import React from 'react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingCompleteSummary } from '@/components/onboarding/OnboardingCompleteSummary';
import { getOnboardingResolution } from '@/app/actions/onboarding';

export const revalidate = 0;

export default async function OnboardingCompletePage() {
  const resolution = await getOnboardingResolution();
  const ctx = resolution?.context;

  const workspaceName = ctx?.workspaceName || 'Your workspace';
  const hasSubscription = Boolean(ctx?.hasSubscriptionDecision);
  const propertyName = ctx?.propertyName;
  const subscriptionStatus = ctx?.subscriptionStatus;

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Step 4 of 4"
        title="You're all set."
        description={`Your PropertyLedge workspace is ready to use.`}
      >
        <OnboardingCompleteSummary
          workspaceName={workspaceName}
          hasSubscription={hasSubscription}
          propertyName={propertyName}
          subscriptionStatus={subscriptionStatus}
        />
      </OnboardingStep>
    </OnboardingContent>
  );
}