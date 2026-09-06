import React from 'react';
import { Building2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-4 select-none">
      <div className="flex flex-col items-center gap-5">
        {/* Official PropertyLedge Logo Container with ambient glow */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-subtle/80 border border-border flex items-center justify-center p-3 shadow-lg shadow-accent/10 transition-all">
            <img
              src="/logo_Light.png"
              alt="PropertyLedge"
              className="w-full h-full object-contain dark:hidden animate-pulse"
            />
            <img
              src="/logo_Dark.png"
              alt="PropertyLedge"
              className="w-full h-full object-contain hidden dark:block animate-pulse"
            />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-accent/15 blur-xl -z-10 animate-pulse" />
        </div>

        {/* Brand Title and Subtitle */}
        <div className="text-center space-y-1">
          <h2 className="font-heading font-bold text-xl text-foreground tracking-tight">
            PropertyLedge<span className="text-accent text-sm font-normal">.com.au</span>
          </h2>
          <p className="text-xs font-medium text-muted">Loading your workspace…</p>
        </div>

        {/* Minimal progress bar */}
        <div className="w-40 h-1 rounded-full bg-surface-subtle overflow-hidden mt-1 border border-border/40">
          <div
            className="h-full bg-gradient-to-r from-accent via-emerald-400 to-accent rounded-full animate-[shimmer_1.5s_infinite_linear]"
            style={{ width: '100%', backgroundSize: '200% 100%' }}
          />
        </div>
      </div>
    </div>
  );
}

