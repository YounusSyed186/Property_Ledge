'use client';

import React, { useState, useTransition } from 'react';
import { ArrowRight } from 'lucide-react';
import { finishOnboarding } from '@/app/actions/onboarding';
import { Button } from '@/components/admin/ui/Button';

export function OnboardingCompleteButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await finishOnboarding();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to open dashboard. Please try again.';
        if (!message.includes('NEXT_REDIRECT')) {
          setError(message);
        }
      }
    });
  };

  return (
    <div className="mt-9">
      <Button
        type="button"
        variant="primary"
        size="md"
        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Opening dashboard…' : 'Go to dashboard'}
      </Button>
      {error && <p className="mt-3 text-sm text-admin-danger">{error}</p>}
    </div>
  );
}
