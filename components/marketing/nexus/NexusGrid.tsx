"use client";

import React from "react";

export function NexusGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Ambient Breathing Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] md:w-[420px] md:h-[420px] bg-accent/8 dark:bg-accent/12 rounded-full blur-[100px] animate-nexus-breathe" />

      {/* Architectural Grid with Radial Mask */}
      <div
        className="absolute inset-0 bg-architectural-grid opacity-25 dark:opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        aria-hidden="true"
      />

      {/* Concentric Architectural Orbit Rings */}
      {/* Outer subtle solid ring with slow 60s rotation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] rounded-full border border-border/40 dark:border-accent/15 animate-nexus-spin-slow">
        {/* Subtle accent architectural tick marks */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-accent/40 rounded-full" />
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-accent/40 rounded-full" />
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-accent/40 rounded-full" />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-accent/40 rounded-full" />
      </div>

      {/* Middle dashed architectural ring with reverse rotation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] sm:w-[270px] sm:h-[270px] rounded-full border border-dashed border-border/50 dark:border-accent/25 animate-nexus-spin-reverse" />

      {/* Inner architectural boundary ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] rounded-full border border-border/30 dark:border-accent/15" />
    </div>
  );
}
