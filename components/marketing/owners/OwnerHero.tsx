"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { Building2, DollarSign, Users, Activity, ShieldCheck, ChevronRight } from "lucide-react";
import { properties } from "@/lib/owners/owner-data";

export function OwnerHero() {
  return (
    <section className="relative pt-32 sm:pt-40 pb-20 md:pb-28 overflow-hidden bg-background dark:bg-[#0E1112]">
      {/* Background Architectural Grid & Subtle Radial Glow */}
      <div className="absolute inset-0 bg-architectural-grid opacity-40 dark:opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-[500px] h-[300px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Headline & Messaging */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>FOR PROPERTY OWNERS</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-bold font-heading tracking-tight leading-[1.08] text-foreground uppercase">
                Own the property. <br />
                <span className="text-accent">Not the paperwork.</span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] max-w-md leading-relaxed font-sans">
                PropertyLedge brings your properties, tenants, leases, rent, inspections and financial records into one place — so you can spend less time managing the details and more time managing your portfolio.
              </p>
            </Reveal>

            {/* Action Buttons */}
            <Reveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Button href="/signup" variant="primary" size="lg" withArrow>
                  Start Free Trial
                </Button>
                <Button href="#problem-section" variant="secondary" size="lg">
                  See How It Works &darr;
                </Button>
              </div>
            </Reveal>

            {/* Small reassurance claims */}
            <Reveal direction="up" delay={0.5}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted dark:text-[#AEB6B8] font-heading font-medium tracking-wide uppercase pt-2 border-t border-border/40 dark:border-[#2A3032]/40">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive Dashboard Mockup representing PORTFOLIO OVERVIEW */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25} duration={0.8}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none">
                {/* Desktop Window Frame Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-surface-subtle dark:bg-[#1B2224] border-b border-border/60 dark:border-[#2A3032]/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 text-[10px] font-heading font-bold text-muted dark:text-[#AEB6B8] tracking-wider uppercase">
                      PORTFOLIO OVERVIEW
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted dark:text-[#AEB6B8]">
                    August 2026
                  </span>
                </div>

                {/* Dashboard Stats */}
                <div className="p-5 border-b border-border/50 dark:border-[#2A3032]/50 bg-surface dark:bg-[#151A1C]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8] flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-accent" />
                        <span>Properties</span>
                      </div>
                      <div className="text-xl font-bold font-heading text-foreground">12</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8] flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-accent" />
                        <span>Monthly Rent</span>
                      </div>
                      <div className="text-xl font-bold font-heading text-foreground">$48,240</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8] flex items-center gap-1">
                        <Users className="w-3 h-3 text-accent" />
                        <span>Occupancy</span>
                      </div>
                      <div className="text-xl font-bold font-heading text-foreground">96.4%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted dark:text-[#AEB6B8] flex items-center gap-1">
                        <Activity className="w-3 h-3 text-accent" />
                        <span>Outstanding</span>
                      </div>
                      <div className="text-xl font-bold font-heading text-accent">$3,420</div>
                    </div>
                  </div>
                </div>

                {/* Properties list preview */}
                <div className="p-5 bg-surface-subtle/20 dark:bg-[#1B2224]/10 space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">
                    <span>Active Properties</span>
                    <span>Status &amp; Rent</span>
                  </div>

                  <div className="space-y-2">
                    {properties.slice(0, 4).map((prop, idx) => {
                      const isOccupied = prop.status === "Occupied";
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/40 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] hover:border-accent/40 dark:hover:border-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-surface-subtle dark:bg-[#1B2224] flex items-center justify-center text-accent">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-heading font-bold text-foreground text-xs">{prop.address}</div>
                              <div className="text-[10px] text-muted dark:text-[#AEB6B8] mt-0.5">Residential Unit</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <div className="font-bold text-foreground">{prop.rent} <span className="text-[9px] font-normal text-muted">/ mo</span></div>
                              <div className="text-[9px] text-muted dark:text-[#AEB6B8] mt-0.5">Occupancy: {prop.occupancy}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-heading font-bold uppercase tracking-wider border ${
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

                  <div className="pt-2 flex justify-center">
                    <button className="text-[10px] font-heading font-bold uppercase tracking-widest text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                      <span>Manage Portfolio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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
