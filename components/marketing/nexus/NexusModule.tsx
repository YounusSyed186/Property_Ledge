"use client";

import React from "react";
import { motion } from "framer-motion";
import { NexusModuleData } from "./types";

interface NexusModuleProps {
  module: NexusModuleData;
  xPercent: number; // percentage X position (0 to 100)
  yPercent: number; // percentage Y position (0 to 100)
  isActive?: boolean;
  isHovered?: boolean;
  isDimmed?: boolean;
  onHoverStart: (id: string) => void;
  onHoverEnd: () => void;
  onClick: (id: string) => void;
}

export function NexusModule({
  module,
  xPercent,
  yPercent,
  isActive = false,
  isHovered = false,
  isDimmed = false,
  onHoverStart,
  onHoverEnd,
  onClick,
}: NexusModuleProps) {
  const Icon = module.icon;

  return (
    <div
      style={{
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: "translate(-50%, -50%)",
      }}
      className="absolute z-30"
    >
      <motion.button
        type="button"
        aria-label={`${module.name} automation module: ${module.description}`}
        onClick={() => onClick(module.id)}
        onMouseEnter={() => onHoverStart(module.id)}
        onMouseLeave={onHoverEnd}
        onFocus={() => onHoverStart(module.id)}
        onBlur={onHoverEnd}
        animate={{
          scale: isHovered ? 1.12 : isActive ? 1.06 : 1,
          opacity: isDimmed ? 0.45 : 1,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        className={`group relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
          isActive || isHovered
            ? "bg-surface dark:bg-[#1A2830] border-accent shadow-lg text-accent"
            : "bg-surface/85 dark:bg-[#0D171B]/90 border-border dark:border-accent/25 text-foreground/80 dark:text-[#A9B1B3] hover:border-accent/60"
        } border backdrop-blur-md shadow-md`}
      >
        {/* Active Node Pulse Ring */}
        {isActive && (
          <span className="absolute inset-0 rounded-xl border border-accent animate-ping pointer-events-none opacity-40" />
        )}

        {/* Module Icon */}
        <Icon
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
            isActive || isHovered ? "text-accent" : "text-foreground/75 dark:text-[#A9B1B3] group-hover:text-accent"
          }`}
        />

        {/* Node Name Label Underneath Node */}
        <span
          className={`absolute -bottom-4 text-[9px] font-medium tracking-wider uppercase whitespace-nowrap transition-colors duration-200 ${
            isActive || isHovered ? "text-accent font-semibold" : "text-muted dark:text-[#768386]"
          }`}
        >
          {module.name}
        </span>
      </motion.button>
    </div>
  );
}
