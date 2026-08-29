'use client';

import React, { useEffect, useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { PropertyCreationWizard } from '@/components/dashboard/properties/PropertyCreationWizard';
import { getOnboardingProgress, skipOnboardingProperty } from '@/app/actions/onboarding';

export default function OnboardingPropertyPage() {
  const { navigate } = useOnboardingNav();
  const [workspaceId, setWorkspaceId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getOnboardingProgress().then((progress) => {
      const id = progress.data.workspaceId as string | undefined;
      if (id) setWorkspaceId(id);
    });
  }, []);

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await skipOnboardingProperty();
      navigate('/onboarding/complete');
    } catch {
      // Continue anyway
      navigate('/onboarding/complete');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Step 3 of 4"
        title="Let's add your first property."
        description="Start with your first property using the complete V1 Property Creation journey. You can add more properties anytime."
      >
        <div className="mt-4">
          <PropertyCreationWizard
            workspaceId={workspaceId}
            onCancel={handleSkip}
            onSuccess={() => navigate('/onboarding/complete')}
          />
        </div>
      </OnboardingStep>
    </OnboardingContent>
  );
}
