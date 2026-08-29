'use client';

import React, { useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { Sparkles, CreditCard, Compass } from 'lucide-react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { selectOnboardingStartOption } from '@/app/actions/onboarding';
import type { SubscriptionPlan } from '@/types/subscriptions';

type StartChoice = 'explore' | 'trial' | 'paid';

interface OnboardingSubscriptionClientProps {
  plans: SubscriptionPlan[];
  recommendedPlanId?: string;
}

export function OnboardingSubscriptionClient({ plans, recommendedPlanId }: OnboardingSubscriptionClientProps) {
  const { navigate } = useOnboardingNav();
  const [choice, setChoice] = useState<StartChoice>('explore');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trialPlan = plans.find((p) => p.slug === 'manager') || plans[plans.length - 1] || plans[0];

  const handleContinue = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (choice === 'explore') {
        const { nextRoute } = await selectOnboardingStartOption('explore');
        navigate(nextRoute);
        return;
      }
      if (choice === 'trial' && trialPlan) {
        const { nextRoute } = await selectOnboardingStartOption('trial', trialPlan.id, trialPlan.slug);
        navigate(nextRoute);
        return;
      }
      if (choice === 'paid') {
        const { nextRoute } = await selectOnboardingStartOption('paid');
        navigate(nextRoute);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your selection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Step 2 of 4"
        title="Choose your experience."
        description="Select the option that fits your portfolio. You can adjust your plan at any time."
      >
        <div className="space-y-3 mt-6">
          <SelectionCard
            id="explore"
            name="startChoice"
            title="Explore first"
            description="Get into PropertyLedge and set up your workspace at your own pace."
            icon={<Compass className="h-4 w-4" />}
            selected={choice === 'explore'}
            onSelect={() => setChoice('explore')}
          />
          {trialPlan && (
            <SelectionCard
              id="trial"
              name="startChoice"
              title="Free trial — 14 days"
              description={`Try the full PropertyLedge experience with the ${trialPlan.name} plan.`}
              icon={<Sparkles className="h-4 w-4" />}
              selected={choice === 'trial'}
              onSelect={() => setChoice('trial')}
            />
          )}
          <SelectionCard
            id="paid"
            name="startChoice"
            title="Choose a plan"
            description="Select a subscription plan and configure secure payment options."
            icon={<CreditCard className="h-4 w-4" />}
            selected={choice === 'paid'}
            onSelect={() => setChoice('paid')}
          />
        </div>

        <OnboardingFooter
          onBack={() => navigate('/onboarding/workspace')}
          onContinue={handleContinue}
          continueType="button"
          continueLoading={isSaving}
          continueLabel={isSaving ? 'Saving…' : 'Continue'}
          error={error}
        />
      </OnboardingStep>
    </OnboardingContent>
  );
}
