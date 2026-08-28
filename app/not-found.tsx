import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/admin/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-admin-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-heading font-bold text-admin-muted">404</p>
        <h1 className="text-xl font-semibold text-admin-foreground">Page not found</h1>
        <p className="text-sm text-admin-muted">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button href="/dashboard">Go to dashboard</Button>
          <Button variant="secondary" href="/login">
            Sign in
          </Button>
        </div>
        <p className="text-xs text-admin-muted pt-4">
          Need help?{' '}
          <Link href="/dashboard/settings" className="text-admin-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
