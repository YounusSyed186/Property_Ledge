'use client';

import React from 'react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import {
  OnboardingPaymentStep,
  type OnboardingPaymentData,
} from '@/components/onboarding/OnboardingPaymentStep';

interface OnboardingPaymentFormProps {
  initialData?: OnboardingPaymentData;
}

export function OnboardingPaymentForm({ initialData }: OnboardingPaymentFormProps) {
  const fallbackData: OnboardingPaymentData = initialData || {
    plan: {
      id: 'landlord',
      name: 'Landlord',
      slug: 'landlord',
      priceCents: 2900,
      billingInterval: 'monthly',
      description: 'Up to 5 properties',
    },
    session: null,
  };

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Step 2 of 4 — Payment"
        title="Complete your subscription."
        description="Transfer direct deposit funds and attach your payment receipt to activate your workspace."
      >
        <OnboardingPaymentStep initialData={fallbackData} />
      </OnboardingStep>
    </OnboardingContent>
  );
}
