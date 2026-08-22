"use client";

import React, { useState, useEffect } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Building2, Sparkles } from "lucide-react";

export function OwnerPortfolioScale() {
  const [scaleStep, setScaleStep] = useState(0);
  const steps = [
    { count: 1, label: "1 Property" },
    { count: 3, label: "3 Properties" },
    { count: 8, label: "8 Properties" },
    { count: 15, label: "15 Properties" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setScaleStep((prev) => (prev < steps.length - 1 ? prev + 1 : 0));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = steps[scaleStep];

  return (
    <section className="py-24 sm:py-32 bg-surface/30 dark:bg-[#151A1C]/20 border-y border-border/50 dark:border-[#2A3032]/50">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Count Animation Display */}
          <div className="lg:col-span-6 flex justify-center">
            <Reveal direction="up" delay={0.2}>
              <div className="w-full max-w-sm rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup p-8 text-center space-y-6 select-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Operational Scaling
                </div>

                {/* Animated counter display */}
                <div className="h-32 flex flex-col justify-center items-center">
                  <div className="text-5xl sm:text-6xl font-extrabold font-heading text-accent tracking-tighter transition-all duration-500 scale-105">
                    {currentStep.count}
                  </div>
                  <div className="text-xs font-bold font-heading text-foreground uppercase tracking-widest mt-2 transition-opacity duration-500">
                    {currentStep.label}
                  </div>
                </div>

                {/* Simulated database workload indicators */}
                <div className="space-y-2.5">
                  <div className="p-3 bg-surface-subtle/50 dark:bg-[#1B2224] rounded-lg border border-border/30 dark:border-[#2A3032]/30 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-muted">
                      <Building2 className="w-4 h-4 text-accent" />
                      <span>Ledger Processing Load</span>
                    </div>
                    <span className="font-bold text-foreground">Optimal (1.2ms)</span>
                  </div>

                  <div className="p-3 bg-surface-subtle/50 dark:bg-[#1B2224] rounded-lg border border-border/30 dark:border-[#2A3032]/30 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-muted">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Admin Time Saved</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {scaleStep === 0 ? "9 hours / mo" : scaleStep === 1 ? "24 hours / mo" : scaleStep === 2 ? "65 hours / mo" : "120 hours / mo"}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Copy & Messaging */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>PORTFOLIO SCALE</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Whether you own one property or twenty.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed">
                Your portfolio can grow without your admin growing with it. PropertyLedge is architected to support landlords from a single residential property up to large multi-property investment portfolios, with zero configuration changes required.
              </p>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
