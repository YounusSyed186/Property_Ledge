import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';

import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { completeWelcomeStage } from '@/app/actions/onboarding';
import { Button } from '@/components/admin/ui/Button';

export const revalidate = 0;

export default function OnboardingWelcomePage() {
  async function handleContinue() {
    'use server';

    await completeWelcomeStage();
    redirect('/onboarding/workspace');
  }

  const setupItems = [
    'Set up your management workspace',
    'Add your properties and units',
    'Configure your preferences',
  ];

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Welcome"
        title="Let’s get your workspace ready."
        description="We’ll guide you through a few simple steps to get PropertyLedge set up for your business."
      >
        {/* Setup preview */}
        <div className="mt-10">
          <div className="space-y-4">
            {setupItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-success/10">
                  <Check
                    className="h-3 w-3 text-admin-success"
                    strokeWidth={2.5}
                  />
                </span>

                <span className="text-sm tracking-[-0.01em] text-admin-muted">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Primary action */}
        <form action={handleContinue} className="mt-10">
          <Button
            type="submit"
            variant="primary"
            size="md"
            rightIcon={
              <ArrowRight className="h-3.5 w-3.5" />
            }
          >
            Get started
          </Button>
        </form>

        {/* Existing workspace */}
        <p className="mt-7 text-sm text-admin-muted">
          Already have a workspace?{' '}
          <Link
            href="/dashboard"
            className="font-medium text-admin-foreground underline-offset-4 hover:underline"
          >
            Go to dashboard
          </Link>
        </p>
      </OnboardingStep>
    </OnboardingContent>
  );
}