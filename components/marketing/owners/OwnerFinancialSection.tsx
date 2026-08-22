"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { BarChart3, Activity } from "lucide-react";
import { financialMetrics } from "@/lib/owners/owner-data";

export function OwnerFinancialSection() {
  const { income, expenses, netIncome, breakdown } = financialMetrics;

  return (
    <section className="py-24 sm:py-32 bg-surface/30 dark:bg-[#151A1C]/20 border-y border-border/50 dark:border-[#2A3032]/50">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Property Performance Breakdown */}
          <div className="lg:col-span-7 order-last lg:order-first">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none">
                
                {/* Header */}
                <div className="px-5 py-4 bg-surface-subtle dark:bg-[#1B2224] border-b border-border/50 dark:border-[#2A3032] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider block">Financial Performance</span>
                    <h3 className="font-heading font-bold text-sm text-foreground mt-0.5">Property Performance</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[9px] font-semibold text-muted dark:text-[#AEB6B8]">FY 2026</span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Summary grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-surface border border-border/30 dark:border-[#2A3032]/40 rounded-lg">
                      <div className="text-[8px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Gross Income</div>
                      <div className="text-sm font-bold font-heading text-foreground mt-1">${income.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-surface border border-border/30 dark:border-[#2A3032]/40 rounded-lg">
                      <div className="text-[8px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Total Expenses</div>
                      <div className="text-sm font-bold font-heading text-foreground mt-1">${expenses.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                      <div className="text-[8px] font-bold text-accent uppercase tracking-wider">Net Yield</div>
                      <div className="text-sm font-bold font-heading text-accent mt-1">${netIncome.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  <div className="space-y-3">
                    <div className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider px-0.5">
                      Expense Distribution
                    </div>

                    <div className="space-y-2.5">
                      {breakdown.map((item, idx) => {
                        const percentage = ((item.amount / expenses) * 100).toFixed(0);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] px-0.5">
                              <span className="font-semibold text-foreground">{item.category}</span>
                              <span className="text-muted font-bold">${item.amount.toLocaleString()} ({percentage}%)</span>
                            </div>
                            {/* Visual elegant status bars */}
                            <div className="h-1.5 w-full bg-surface-subtle dark:bg-[#1B2224] rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percentage}%` }}
                                className="h-full bg-accent dark:bg-accent/80 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </Reveal>
          </div>

          {/* Right Column: Text explanation */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>FINANCIAL REPORTING</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Turn property activity into financial clarity.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed font-sans">
                PropertyLedge summarizes gross rental earnings, logs operational repairs, and calculates net yields automatically. Obtain clean, structured performance breakdowns for simple year-end reporting.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <div className="p-4 border border-border/40 dark:border-[#2A3032]/40 rounded-xl bg-surface dark:bg-[#151A1C] flex gap-3">
                <div className="w-8 h-8 rounded bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-heading text-foreground uppercase tracking-wide">Structured Ledgers</h4>
                  <p className="text-[10px] text-muted dark:text-[#AEB6B8] mt-0.5 leading-snug">
                    Generate ledger CSV or PDF summaries grouping outgoings like insurance, water, and emergency repairs dynamically.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
