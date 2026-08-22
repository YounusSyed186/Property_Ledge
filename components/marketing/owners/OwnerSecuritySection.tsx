"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Shield, Key, Lock, ArrowRight } from "lucide-react";

export function OwnerSecuritySection() {
  return (
    <section className="py-24 sm:py-32 bg-background dark:bg-[#0E1112]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Copy content */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>DATA PROTECTION</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Your portfolio stays yours.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed">
                PropertyLedge uses authenticated access and database-level controls to help ensure property information is only available to authorised users. Your data is isolated, protected, and private.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <div className="flex items-center gap-2.5 text-xs text-muted dark:text-[#AEB6B8] font-bold font-heading uppercase tracking-wide">
                <Lock className="w-4 h-4 text-accent" />
                <span>Enterprise grade database isolation</span>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Minimalist security flow diagram */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup p-8 text-foreground text-xs select-none flex flex-col items-center justify-center">
                
                {/* Horizontal nodes diagram: Your Account -> Your Properties -> Your Data */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-4 w-full">
                  
                  {/* Account Node */}
                  <div className="p-4 rounded-xl border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] text-center w-full sm:w-40 flex flex-col items-center gap-2 shadow-sm">
                    <div className="w-8 h-8 rounded bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center">
                      <Key className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-heading font-bold text-[10px] text-foreground uppercase tracking-widest">
                      Your Account
                    </span>
                    <span className="text-[9px] text-muted">Secure Auth Login</span>
                  </div>

                  {/* Arrow */}
                  <div className="rotate-90 sm:rotate-0 text-accent">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  {/* Properties Node */}
                  <div className="p-4 rounded-xl border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] text-center w-full sm:w-40 flex flex-col items-center gap-2 shadow-sm">
                    <div className="w-8 h-8 rounded bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center">
                      <Shield className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-heading font-bold text-[10px] text-foreground uppercase tracking-widest">
                      Your Properties
                    </span>
                    <span className="text-[9px] text-muted">Database Isolation</span>
                  </div>

                  {/* Arrow */}
                  <div className="rotate-90 sm:rotate-0 text-accent">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  {/* Data Node */}
                  <div className="p-4 rounded-xl border border-accent/60 bg-accent/5 text-center w-full sm:w-40 flex flex-col items-center gap-2 shadow-sm">
                    <div className="w-8 h-8 rounded bg-accent text-white flex items-center justify-center">
                      <Lock className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-heading font-bold text-[10px] text-accent uppercase tracking-widest">
                      Your Data
                    </span>
                    <span className="text-[9px] text-accent font-semibold">100% Protected</span>
                  </div>

                </div>

              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
