'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, LogOut } from 'lucide-react';
import { ThemeSelector } from '@/components/ui/ThemeSelector';

interface OnboardingHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function OnboardingHeader({ userName = 'User', userEmail }: OnboardingHeaderProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleSaveExit = () => {
    setIsExiting(true);
    // Simple state-saving transition before redirection
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 400);
  };

  return (
    <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-admin-border/50 bg-admin-surface px-6 sm:px-8">
      {/* Brand Logo */}
      <Link href="/onboarding" className="flex items-center gap-2.5 group">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border/80 bg-admin-sidebar-surface overflow-hidden group-hover:border-admin-border transition-colors">
          <img src="/logo_Light.png" alt="" className="h-5 w-5 object-contain" />
        </div>
        <span className="font-heading text-sm font-semibold tracking-tight text-admin-foreground">PropertyLedge</span>
      </Link>

      {/* Quick Actions */}
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          href="https://propertyledge.com/support"
          target="_blank"
          className="flex items-center gap-1.5 text-xs font-medium text-admin-muted hover:text-admin-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Help</span>
        </Link>

        <button
          onClick={handleSaveExit}
          disabled={isExiting}
          className="flex items-center gap-1.5 text-xs font-medium text-admin-muted hover:text-admin-foreground transition-colors disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{isExiting ? 'Saving...' : 'Save & exit'}</span>
        </button>

        <div className="h-4 w-[1px] bg-admin-border/60" />

        <div className="flex items-center gap-3">
          <ThemeSelector />
          <div
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-admin-border bg-admin-surface-subtle text-xs font-bold text-admin-foreground cursor-default"
            title={userEmail}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
