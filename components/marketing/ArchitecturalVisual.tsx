"use client";

import React from "react";

export function ArchitecturalFacadeVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border dark:border-[#1E2E35] bg-gradient-to-br from-surface to-surface-subtle shadow-mockup ${className}`}>
      {/* High-end architectural luxury property facade image */}
      <img
        src="/images/loginBG.png"
        alt="Property Inspection Visual"
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Overlay caption tag */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-surface/90 dark:bg-[#0E1A1F]/90 backdrop-blur-md border border-border dark:border-[#1E2E35] text-xs shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground dark:text-[#F4F3EF]">12 Anderson Street, Sydney</span>
        </div>
        <span className="text-accent font-heading font-semibold">Inspection Complete • Report Ready</span>
      </div>
    </div>
  );
}

export function LuxuryInteriorVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border dark:border-[#1E2E35] bg-gradient-to-br from-surface to-surface-subtle shadow-mockup ${className}`}>
      <img
        src="/images/RentCollectionSection.png"
        alt="Rent Collection & Financial Performance Visual"
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-surface/90 dark:bg-[#0E1A1F]/90 backdrop-blur-md border border-border dark:border-[#1E2E35] text-[11px] font-mono font-semibold text-accent shadow-md">
        Occupancy: 100%
      </div>
    </div>
  );
}
