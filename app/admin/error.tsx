'use client';

import React from 'react';
import { Button } from '@/components/admin/ui';
import { ErrorState } from '@/components/admin/ui/States';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <ErrorState
        title="Admin error"
        description={error.message || "We couldn't load this admin page."}
        onRetry={reset}
      />
      <div className="mt-4 text-center">
        <Button variant="secondary" href="/admin">
          Back to admin
        </Button>
      </div>
    </div>
  );
}
