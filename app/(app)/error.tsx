'use client';

import React from 'react';
import { Button } from '@/components/admin/ui';
import { ErrorState } from '@/components/admin/ui/States';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <ErrorState
        title="Something went wrong"
        description={error.message || "We couldn't load this page. Please try again."}
        onRetry={reset}
      />
      <div className="mt-4 text-center">
        <Button variant="secondary" href="/dashboard">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
