"use client";

import React from "react";
import { motion } from "framer-motion";

interface NexusCoreProps {
  isProcessing?: boolean;
  activeLabel?: string | null;
}

export function NexusCore({ isProcessing = false, activeLabel }: NexusCoreProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none select-none z-20">
      {/* Outer subtle scanning ring (Layer 3) */}
      <div className="absolute w-[116px] h-[116px] sm:w-[124px] sm:h-[124px] rounded-full pointer-events-none animate-nexus-spin-scanner">
        <div className="w-full h-full rounded-full border border-transparent border-t-accent/60 border-r-accent/30" />
      </div>

      {/* Orbit ring surrounding core (Layer 2) */}
      <div className="absolute w-[100px] h-[100px] sm:w-[108px] sm:h-[108px] rounded-full border border-border/60 dark:border-accent/30 pointer-events-none animate-nexus-spin-slow" />

      {/* Core Container (Layer 4 - Glass/Metallic) */}
      <motion.div
        animate={{
          scale: isProcessing ? 1.03 : 1,
          boxShadow: isProcessing
            ? "0 0 35px rgba(169, 146, 125, 0.28), 0 10px 25px rgba(0, 0, 0, 0.4)"
            : "0 0 20px rgba(169, 146, 125, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3)",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-surface/90 dark:bg-gradient-to-br dark:from-[#1A262C] dark:to-[#0D171B] border border-border dark:border-accent/40 backdrop-blur-xl flex flex-col items-center justify-center p-3.5 shadow-2xl transition-colors duration-300"
      >
        {/* Soft inner highlight shimmer */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.08] pointer-events-none" />

        {/* Brand Logo */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 relative flex items-center justify-center">
          <img
            src="/logo_Light.png"
            alt="PropertyLedge Core"
            className="w-full h-full object-contain dark:hidden"
          />
          <img
            src="/logo_Dark.png"
            alt="PropertyLedge Core"
            className="w-full h-full object-contain hidden dark:block"
          />
        </div>

        {/* Operational Status indicator */}
        <div className="mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-nexus-pulse-subtle" />
          <span className="text-[8px] font-mono font-semibold tracking-wider uppercase text-muted-dark dark:text-[#A9B1B3]">
            CORE
          </span>
        </div>
      </motion.div>

      {/* Core Telemetry & Status directly underneath */}
      <div className="mt-2.5 flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-subtle/80 dark:bg-[#111E23]/90 border border-border/60 dark:border-accent/20 backdrop-blur-sm shadow-sm">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-mono tracking-widest uppercase text-accent font-medium">
            {activeLabel ? activeLabel : "SYSTEM ACTIVE"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono text-muted dark:text-[#768386] tracking-tight mt-0.5">
          <span>WORKFLOWS <strong className="text-foreground dark:text-[#F4F1EC] font-semibold">1,284</strong></span>
          <span>•</span>
          <span>SUCCESS <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">99.8%</strong></span>
        </div>
      </div>
    </div>
  );
}
