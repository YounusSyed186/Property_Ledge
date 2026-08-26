'use client';

import React from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { SubscriptionCheckout } from '@/components/subscription/SubscriptionCheckout';
import { completeOnboardingStep } from '@/app/actions/onboarding';

export function OnboardingPaymentForm() {
  const { navigate } = useOnboardingNav();

  const handlePaymentSubmitted = async () => {
    await completeOnboardingStep('subscription', { paymentSubmitted: true });
    navigate('/onboarding/property');
  };

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Payment"
        title="Complete your subscription"
        description="Submit your payment details. Your subscription will be activated once approved."
      >
        <SubscriptionCheckout initialPlanSlug="landlord" />
        <OnboardingFooter
          onBack={() => navigate('/onboarding/plans')}
          onContinue={handlePaymentSubmitted}
          continueType="button"
          continueLabel="Continue to property setup"
        />
        <p className="mt-4 text-xs text-admin-muted">
          Secure payment — your payment information is securely processed.
        </p>
      </OnboardingStep>
    </OnboardingContent>
  );
}
