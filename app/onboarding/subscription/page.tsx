import React from 'react';
import { OnboardingSubscriptionClient } from '@/components/onboarding/OnboardingSubscriptionClient';
import { fetchOnboardingPlans } from '@/app/actions/onboarding';

export const revalidate = 0;

export default async function OnboardingSubscriptionPage() {
  const plans = await fetchOnboardingPlans();
  const recommendedPlan = plans.length > 0 ? plans[plans.length - 1] : null;

  return <OnboardingSubscriptionClient plans={plans} recommendedPlanId={recommendedPlan?.id} />;
}
