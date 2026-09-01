'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Tenant Portal Error:', error);
  }, [error]);

  return (
    <div className="h-full min-h-[400px] w-full flex items-center justify-center p-6 bg-admin-surface text-admin-foreground">
      <div className="max-w-md w-full p-6 rounded-xl bg-admin-surface-elevated border border-admin-border shadow-elevation-3 text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-admin-danger/10 border border-admin-danger/20 text-admin-danger mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-admin-foreground">Tenant Portal Error</h2>
          <p className="text-xs text-admin-muted">
            We were unable to retrieve your tenancy or lease details. Please try again.
          </p>
        </div>

        {error.message && (
          <div className="p-3 rounded-lg bg-black/20 border border-admin-border text-left text-xs font-mono text-admin-primary overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-3 rounded-lg bg-admin-primary text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-admin-primary/90 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <Link
            href="/tenant"
            className="flex-1 py-2.5 px-3 rounded-lg bg-admin-surface-subtle border border-admin-border text-admin-foreground font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-admin-surface transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Tenant Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
