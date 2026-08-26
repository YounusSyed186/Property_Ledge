'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { ThemeSelector } from '@/components/ui/ThemeSelector';

interface OnboardingHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function OnboardingHeader({ userName = 'User', userEmail }: OnboardingHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-admin-border bg-admin-surface px-4 sm:px-6">
      <Link href="/onboarding" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-admin-sidebar-surface overflow-hidden">
          <img src="/logo_Light.png" alt="" className="h-5 w-5 object-contain" />
        </div>
        <span className="font-heading text-sm font-bold tracking-tight text-admin-foreground">PropertyLedge</span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard/settings"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-admin-muted hover:text-admin-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Help
        </Link>
        <ThemeSelector />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-admin-surface-subtle text-xs font-bold text-admin-foreground"
          title={userEmail}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
