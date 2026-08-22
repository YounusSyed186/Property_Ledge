"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CheckCircle2, TrendingUp } from "lucide-react";

export function OwnerRentSection() {
  return (
    <section className="py-24 sm:py-32 bg-surface/30 dark:bg-[#151A1C]/20 border-y border-border/50 dark:border-[#2A3032]/50">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Visual financial chart/dashboard */}
          <div className="lg:col-span-7 order-last lg:order-first">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none">
                
                {/* Header */}
                <div className="px-5 py-4 bg-surface-subtle dark:bg-[#1B2224] border-b border-border/50 dark:border-[#2A3032] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider block">Financial Performance</span>
                    <h3 className="font-heading font-bold text-sm text-foreground mt-0.5">Rent Tracking</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-semibold text-muted dark:text-[#AEB6B8]">Auto Sync</span>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  {/* Grid Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/30 dark:border-[#2A3032] rounded-lg">
                      <div className="text-[8px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Monthly Rent</div>
                      <div className="text-base font-bold font-heading text-foreground mt-0.5">$48,240</div>
                    </div>
                    <div className="p-3 bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/30 dark:border-[#2A3032] rounded-lg">
                      <div className="text-[8px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Collected</div>
                      <div className="text-base font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-0.5">$44,820</div>
                    </div>
                    <div className="p-3 bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/30 dark:border-[#2A3032] rounded-lg">
                      <div className="text-[8px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Outstanding</div>
                      <div className="text-base font-bold font-heading text-accent mt-0.5">$3,420</div>
                    </div>
                    <div className="p-3 bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/30 dark:border-[#2A3032] rounded-lg">
                      <div className="text-[8px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Upcoming</div>
                      <div className="text-base font-bold font-heading text-muted mt-0.5">$6,480</div>
                    </div>
                  </div>

                  {/* Restrained elegant custom SVG bar/donut chart */}
                  <div className="p-4 bg-surface-subtle/30 dark:bg-[#1B2224]/30 rounded-xl border border-border/30 dark:border-[#2A3032]/30 flex flex-col sm:flex-row items-center gap-6">
                    {/* SVG Donut */}
                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {/* Background track */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                        
                        {/* Collected (Green/Sage) - 92.9% */}
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="15.915" 
                          fill="none" 
                          stroke="#10B981" 
                          strokeWidth="3.2" 
                          strokeDasharray="92.9 7.1" 
                          strokeDashoffset="0" 
                        />
                        
                        {/* Outstanding (Taupe) - 7.1% */}
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="15.915" 
                          fill="none" 
                          stroke="#A9927D" 
                          strokeWidth="3.2" 
                          strokeDasharray="7.1 92.9" 
                          strokeDashoffset="-92.9" 
                        />
                      </svg>
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Collected</span>
                        <span className="text-sm font-bold font-heading text-foreground">92.9%</span>
                      </div>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex-1 space-y-2.5 w-full">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border/30 dark:border-[#2A3032]/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="font-medium text-foreground">Collected Income</span>
                        </div>
                        <span className="font-bold text-foreground">$44,820</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border/30 dark:border-[#2A3032]/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                          <span className="font-medium text-foreground">Outstanding Invoices</span>
                        </div>
                        <span className="font-bold text-accent">$3,420</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                          <span className="font-medium text-foreground">Upcoming Schedules</span>
                        </div>
                        <span className="font-bold text-foreground">$6,480</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Text descriptions */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>RENT &amp; PAYMENTS</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Know what your properties are earning.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed">
                Track rental income, generate automated invoices, and watch payments settle directly. Keep complete visibility over payouts, upcoming schedules, and outstanding balances.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 border border-border/40 dark:border-[#2A3032]/40 rounded-lg bg-surface dark:bg-[#151A1C]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <h4 className="text-xs font-bold font-heading text-foreground uppercase tracking-wide">Automatic Invoicing</h4>
                  <p className="text-[10px] text-muted dark:text-[#AEB6B8] mt-1 leading-snug">Invoices are dispatched and reconciled automatically.</p>
                </div>
                <div className="p-3 border border-border/40 dark:border-[#2A3032]/40 rounded-lg bg-surface dark:bg-[#151A1C]">
                  <TrendingUp className="w-4 h-4 text-accent mb-2" />
                  <h4 className="text-xs font-bold font-heading text-foreground uppercase tracking-wide">Settlement Sync</h4>
                  <p className="text-[10px] text-muted dark:text-[#AEB6B8] mt-1 leading-snug">Real-time ledger updates as payments resolve.</p>
                </div>
              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
