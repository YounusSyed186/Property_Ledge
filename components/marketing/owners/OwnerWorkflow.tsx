"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ArrowRight, ArrowDown, Sparkles, Plus, UserPlus, FileSignature, Landmark, Calculator, Eye, TrendingUp } from "lucide-react";
import { workflowSteps } from "@/lib/owners/owner-data";

export function OwnerWorkflow() {
  const getIcon = (num: string) => {
    switch (num) {
      case "01":
        return Plus;
      case "02":
        return UserPlus;
      case "03":
        return FileSignature;
      case "04":
        return Landmark;
      case "05":
        return Calculator;
      case "06":
        return Eye;
      case "07":
        return TrendingUp;
      default:
        return Sparkles;
    }
  };

  return (
    <section className="py-24 sm:py-32 bg-background dark:bg-[#0E1112]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl space-y-4 mb-16">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel dot>OWNER WORKFLOW</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
              From property acquisition to portfolio oversight.
            </h2>
          </Reveal>
        </div>

        {/* Process steps horizontal on desktop, vertical on mobile */}
        <Reveal direction="up" delay={0.25}>
          {/* Desktop view (scrollable flow or grid) */}
          <div className="hidden lg:grid grid-cols-7 gap-4 relative">
            
            {workflowSteps.map((step, idx) => {
              const Icon = getIcon(step.number);
              return (
                <div key={idx} className="relative group">
                  {/* Step Card */}
                  <div className="p-4 rounded-xl border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] hover:border-accent dark:hover:border-accent/40 shadow-sm transition-all h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Step Number & Icon */}
                      <div className="flex items-center justify-between border-b border-border/30 dark:border-[#2A3032]/40 pb-2.5">
                        <span className="font-heading font-bold text-accent tracking-wider text-xs">
                          {step.number}
                        </span>
                        <div className="w-6 h-6 rounded bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h4 className="font-heading font-bold text-foreground text-xs leading-snug">
                          {step.title}
                        </h4>
                        <p className="text-[10px] text-muted mt-1 leading-snug">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {/* Miniature UI preview element */}
                    <div className="mt-4 pt-3 border-t border-border/30 dark:border-[#2A3032]/40">
                      <div className="h-6 w-full rounded bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/20 dark:border-[#2A3032]/20 flex items-center justify-between px-1.5 text-[8px] text-muted">
                        <span>Workflow ready</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrow pointing right */}
                  {idx < 6 && (
                    <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 bg-surface dark:bg-[#151A1C] border border-border dark:border-[#2A3032] rounded-full p-0.5 z-10">
                      <ArrowRight className="w-3 h-3 text-accent" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile view (vertical stack) */}
          <div className="lg:hidden space-y-4">
            {workflowSteps.map((step, idx) => {
              const Icon = getIcon(step.number);
              return (
                <div key={idx} className="relative flex flex-col items-center">
                  <div className="w-full p-4 rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-accent text-xs">{step.number}</span>
                        <h4 className="font-heading font-bold text-foreground text-xs">{step.title}</h4>
                      </div>
                      <p className="text-[11px] text-muted dark:text-[#AEB6B8] mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Flow Arrow pointing down */}
                  {idx < 6 && (
                    <div className="my-2 bg-surface dark:bg-[#151A1C] border border-border dark:border-[#2A3032] rounded-full p-1 z-10">
                      <ArrowDown className="w-3 h-3 text-accent" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>

      </div>
    </section>
  );
}
