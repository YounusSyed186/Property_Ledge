import React from 'react';
import { Building2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#07111F] text-[#F4F7F9] p-4 select-none">
      <div className="flex flex-col items-center gap-4">
        {/* Brand Icon with pulsing glow */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center shadow-lg shadow-[#008F83]/10">
            <Building2 className="w-7 h-7 text-[#008F83] animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-[#008F83]/20 blur-md -z-10 animate-pulse" />
        </div>

        {/* Brand Title and Subtitle */}
        <div className="text-center space-y-1">
          <h2 className="font-heading font-bold text-lg text-white tracking-tight">PropertyLedge</h2>
          <p className="text-xs font-medium text-[#7F8B99]">Loading your workspace…</p>
        </div>

        {/* Minimal progress bar */}
        <div className="w-36 h-1 rounded-full bg-[#17283A] overflow-hidden mt-1">
          <div className="h-full bg-gradient-to-r from-[#008F83] via-[#32D5C4] to-[#008F83] rounded-full animate-[shimmer_1.5s_infinite_linear]" style={{ width: '100%', backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  );
}

