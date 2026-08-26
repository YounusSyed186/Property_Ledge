import React from 'react';

import { Check } from 'lucide-react';

import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingCompleteButton } from '@/components/onboarding/OnboardingCompleteButton';
import { getOnboardingResolution } from '@/app/actions/onboarding';

export const revalidate = 0;

export default async function OnboardingCompletePage() {
  const resolution = await getOnboardingResolution();
  const ctx = resolution?.context;

  const workspaceName = ctx?.workspaceName || 'Your workspace';

  const items = [
    {
      label: 'Workspace created',
      done: Boolean(ctx?.hasWorkspace),
    },
    {
      label: 'Subscription configured',
      done: Boolean(ctx?.hasSubscriptionDecision),
    },
    {
      label: 'Property added',
      done: Boolean(ctx?.hasProperty),
    },
  ];

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Complete"
        title="You're all set."
        description={`${workspaceName} is ready to use. You can now manage your properties from your dashboard.`}
      >
        {/* Completion mark */}
        <div className="mt-9 flex h-12 w-12 items-center justify-center rounded-full bg-admin-success/10">
          <Check
            className="h-5 w-5 text-admin-success"
            strokeWidth={2.5}
          />
        </div>

        {/* Setup summary */}
        <div className="mt-8 space-y-1">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 py-2"
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  item.done
                    ? 'bg-admin-success/10 text-admin-success'
                    : 'border border-admin-border text-admin-muted',
                ].join(' ')}
              >
                {item.done && (
                  <Check
                    className="h-3 w-3"
                    strokeWidth={2.5}
                  />
                )}
              </span>

              <span
                className={[
                  'text-sm tracking-[-0.01em]',
                  item.done
                    ? 'text-admin-foreground'
                    : 'text-admin-muted',
                ].join(' ')}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <OnboardingCompleteButton />
      </OnboardingStep>
    </OnboardingContent>
  );
}