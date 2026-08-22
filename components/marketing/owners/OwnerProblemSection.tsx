"use client";

import React from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { 
  Mail, 
  FileSpreadsheet, 
  Receipt, 
  FileText, 
  Camera, 
  Bell, 
  Scale, 
  MessageSquare,
  Sparkles,
  ArrowDown
} from "lucide-react";

export function OwnerProblemSection() {
  const shouldReduceMotion = useReducedMotion();

  const items = [
    { label: "Email", icon: Mail },
    { label: "Spreadsheets", icon: FileSpreadsheet },
    { label: "Bank Statements", icon: Receipt },
    { label: "Lease PDFs", icon: FileText },
    { label: "Inspection Photos", icon: Camera },
    { label: "Rent Reminders", icon: Bell },
    { label: "Tax Records", icon: Scale },
    { label: "Tenant Messages", icon: MessageSquare }
  ];

  // Framer Motion configuration
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }
    : {
        hidden: { opacity: 0, scale: 0.85, y: 15 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } }
      };

  const lineVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 0.6 }
      }
    : {
        hidden: { pathLength: 0, opacity: 0 },
        visible: { pathLength: 1, opacity: 0.6, transition: { duration: 1, ease: "easeInOut", delay: 0.5 } }
      };

  const centralLogoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { delay: 1.2, duration: 0.5 } }
  };

  return (
    <section id="problem-section" className="py-24 sm:py-32 border-y border-border/50 dark:border-[#2A3032]/50 bg-surface/30 dark:bg-[#151A1C]/20 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <SectionLabel dot>PROPERTY OWNERS KNOW THE PROBLEM</SectionLabel>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
            Your portfolio shouldn't live across twelve different places.
          </h2>
        </div>

        {/* Fragmented Tools Grid & Convergence Visual */}
        <div className="relative max-w-4xl mx-auto py-12">
          {/* Connecting SVG lines (Background) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none hidden md:block">
            <svg viewBox="0 0 800 350" fill="none" className="w-full h-full stroke-accent/40 dark:stroke-accent/20">
              {/* Lines from left column blocks to center bottom */}
              <motion.path d="M 120 70 Q 280 180 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              <motion.path d="M 280 70 Q 340 180 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              <motion.path d="M 440 70 Q 420 180 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              <motion.path d="M 600 70 Q 520 180 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              
              {/* Top layer items connections */}
              <motion.path d="M 120 170 Q 280 210 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              <motion.path d="M 280 170 Q 340 210 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              <motion.path d="M 440 170 Q 420 210 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
              <motion.path d="M 600 170 Q 520 210 400 240" strokeWidth="1.5" strokeDasharray="3 3" variants={lineVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} />
            </svg>
          </div>

          {/* Cards Items Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 mb-20 relative z-10"
          >
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] hover:border-accent dark:hover:border-accent/40 shadow-sm transition-shadow text-center min-h-[96px] group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold font-heading uppercase tracking-wider text-foreground leading-tight">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Convergence Resolve Area */}
          <motion.div
            variants={centralLogoVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-foreground text-background dark:bg-foreground dark:text-background flex items-center justify-center shadow-lg relative border border-border">
              <Sparkles className="w-7 h-7 text-accent animate-pulse" />
              {/* Dynamic pointer line */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <ArrowDown className="w-4 h-4 text-accent animate-bounce" />
              </div>
            </div>

            <div className="font-heading font-extrabold text-lg uppercase tracking-widest text-foreground">
              PROPERTYLEDGE
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold font-heading text-foreground">
                One property. One record. One place to manage it.
              </h3>
              <p className="text-xs text-muted dark:text-[#AEB6B8] leading-relaxed">
                We pull your entire operation into a single, unified database system. Every rent transaction, lease document, and inspection photo maps directly to the property ledger.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
