'use client';

import React, { useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { PlanCard } from '@/components/onboarding/PlanCard';
import { selectOnboardingPlan } from '@/app/actions/onboarding';
import type { SubscriptionPlan } from '@/types/subscriptions';

interface OnboardingPlansClientProps {
  plans: SubscriptionPlan[];
  recommendedPlanId?: string;
}

export function OnboardingPlansClient({ plans, recommendedPlanId }: OnboardingPlansClientProps) {
  const { navigate } = useOnboardingNav();
  const [selectedId, setSelectedId] = useState<string | null>(recommendedPlanId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const plan = plans.find((p) => p.id === selectedId);
    if (!plan) {
      setError('Please select a plan to continue.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { nextRoute } = await selectOnboardingPlan(plan.id, plan.slug, plan.price_cents ?? 0);
      navigate(nextRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to select plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <OnboardingStep 
        eyebrow="Step 2 of 4" 
        title="Choose your plan." 
        description="Select the subscription plan that matches your property portfolio size."
      >
        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                price_cents: plan.price_cents ?? 0,
                billing_interval: plan.billing_interval,
                features: plan.slug === 'manager' 
                  ? ['Up to 50 properties', 'Advanced tenant screening', 'Standard reporting'] 
                  : plan.slug === 'landlord'
                  ? ['Up to 5 properties', 'Core lease management', 'Email support']
                  : ['Unlimited properties', 'API & webhooks', 'Custom contract options']
              }}
              recommended={plan.id === recommendedPlanId}
              selected={selectedId === plan.id}
              onSelect={() => setSelectedId(plan.id)}
            />
          ))}
        </div>

        {plans.length === 0 && (
          <p className="text-sm text-admin-muted mt-6">No plans are available right now. You can continue to property setup.</p>
        )}

        <OnboardingFooter
          onBack={() => navigate('/onboarding/subscription')}
          onContinue={handleContinue}
          continueType="button"
          continueLoading={isSaving}
          continueLabel={isSaving ? 'Saving…' : 'Continue'}
          continueDisabled={plans.length > 0 && !selectedId}
          error={error}
        />
      </OnboardingStep>
    </OnboardingContent>
  );
}
