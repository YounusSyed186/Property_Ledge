import React from 'react';
import { OnboardingPlansClient } from '@/components/onboarding/OnboardingPlansClient';
import { fetchOnboardingPlans } from '@/app/actions/onboarding';

export const revalidate = 0;

export default async function OnboardingPlansPage() {
  const plans = await fetchOnboardingPlans();
  const sorted = [...plans].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const recommendedId = sorted[sorted.length - 1]?.id;

  return <OnboardingPlansClient plans={sorted} recommendedPlanId={recommendedId} />;
}
