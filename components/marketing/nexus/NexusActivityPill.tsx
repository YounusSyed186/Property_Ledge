"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NexusActivityPillProps {
  label: string | null;
}

export function NexusActivityPill({ label }: NexusActivityPillProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <AnimatePresence mode="wait">
        {label && (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.94 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated/95 dark:bg-[#111E23]/95 border border-accent/40 shadow-xl backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-foreground dark:text-[#F4F1EC]">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
