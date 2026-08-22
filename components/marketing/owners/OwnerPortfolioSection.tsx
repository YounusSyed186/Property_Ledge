"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Building2, TrendingUp, AlertCircle } from "lucide-react";
import { properties } from "@/lib/owners/owner-data";

export function OwnerPortfolioSection() {
  return (
    <section className="py-24 sm:py-32 bg-background dark:bg-[#0E1112]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Text description */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>YOUR PORTFOLIO</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                See your entire portfolio at a glance.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed">
                Know what you own, what's earning, what's occupied and what needs your attention — without opening multiple spreadsheets or disconnected applications.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <div className="space-y-4">
                <div className="flex gap-3.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">✓</div>
                  <div>
                    <h4 className="text-xs font-bold font-heading text-foreground uppercase tracking-wide">Real-time Occupancy Tracking</h4>
                    <p className="text-[11px] text-muted dark:text-[#AEB6B8] mt-0.5">Instantly see vacancy statuses and upcoming tenancy conclusions.</p>
                  </div>
                </div>
                <div className="flex gap-3.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">✓</div>
                  <div>
                    <h4 className="text-xs font-bold font-heading text-foreground uppercase tracking-wide">Income Stream Health</h4>
                    <p className="text-[11px] text-muted dark:text-[#AEB6B8] mt-0.5">Consolidated updates across single or multiple properties.</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Large portfolio dashboard mockup */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none">
                {/* Dashboard Frame Header */}
                <div className="px-5 py-4 bg-surface-subtle dark:bg-[#1B2224] border-b border-border/50 dark:border-[#2A3032] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider block">Portfolio Workspace</span>
                    <h3 className="font-heading font-bold text-sm text-foreground mt-0.5">Portfolio Overview</h3>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 bg-accent/15 text-accent border border-accent/25 rounded-md font-bold font-heading uppercase tracking-wide">
                    Live Database
                  </span>
                </div>

                {/* Main Content Area */}
                <div className="p-5 space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/40 dark:border-[#2A3032] text-center">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8]">Total Properties</div>
                      <div className="text-lg font-bold font-heading text-foreground mt-1">12</div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/40 dark:border-[#2A3032] text-center">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8]">Monthly Rent</div>
                      <div className="text-lg font-bold font-heading text-foreground mt-1">$48,240</div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-surface-subtle/50 dark:bg-[#1B2224] border border-border/40 dark:border-[#2A3032] text-center">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8]">Occupancy</div>
                      <div className="text-lg font-bold font-heading text-foreground mt-1">96.4%</div>
                    </div>
                  </div>

                  {/* Properties Table */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider px-1">
                      Your Properties
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {properties.map((prop, idx) => {
                        const isOccupied = prop.status === "Occupied";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/40 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] hover:border-accent/40 dark:hover:border-accent/30 transition-colors"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-8 h-8 rounded bg-surface-subtle dark:bg-[#1B2224] flex items-center justify-center text-accent">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-heading font-bold text-foreground text-xs">{prop.address}</span>
                                <div className="text-[9px] text-muted dark:text-[#AEB6B8] mt-0.5">Residential portfolio</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <span className="font-bold text-foreground">{prop.rent} <span className="text-[9px] font-normal text-muted">/ mo</span></span>
                                <div className="text-[9px] text-muted dark:text-[#AEB6B8] mt-0.5 flex items-center gap-1 justify-end">
                                  {isOccupied ? (
                                    <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                                  ) : (
                                    <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                  )}
                                  <span>Trend stable</span>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] font-heading font-bold uppercase tracking-wider border ${
                                  isOccupied
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {prop.status}
                              </span>
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
        </div>
      </div>
    </section>
  );
}
