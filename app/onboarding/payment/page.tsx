import React from 'react';
import { OnboardingPaymentForm } from '@/components/onboarding/OnboardingPaymentForm';
import { getOnboardingPaymentContext } from '@/app/actions/onboarding';

export const revalidate = 0;

export default async function OnboardingPaymentPage() {
  const paymentContext = await getOnboardingPaymentContext();
  return <OnboardingPaymentForm initialData={paymentContext} />;
}
