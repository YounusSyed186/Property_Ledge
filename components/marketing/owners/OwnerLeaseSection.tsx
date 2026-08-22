"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FileText, ArrowRight } from "lucide-react";
import { leases } from "@/lib/owners/owner-data";

export function OwnerLeaseSection() {
  return (
    <section className="py-24 sm:py-32 bg-background dark:bg-[#0E1112]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text descriptions */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>LEASE MANAGEMENT</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Every lease. Exactly where you expect it.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed font-sans">
                Keep every agreement, date, and tenant contact detail accessible in one centralized space. Understand the relational timeline between your properties, tenants, and active lease records.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              {/* Relational Indicators diagram snippet */}
              <div className="p-4 rounded-xl border border-border/40 dark:border-[#2A3032]/40 bg-surface/50 dark:bg-[#151A1C]/50 space-y-3.5 max-w-sm">
                <div className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">
                  Connected Records Architecture
                </div>
                <div className="flex items-center gap-3.5 text-xs text-foreground font-semibold">
                  <span className="px-2 py-1 rounded bg-surface border border-border text-[10px]">Property</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-[10px] text-accent">Tenant</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="px-2 py-1 rounded bg-foreground text-background text-[10px]">Lease</span>
                </div>
                <p className="text-[10px] text-muted dark:text-[#AEB6B8] leading-snug">
                  PropertyLedge maps databases relationally: updating a tenant record automatically refreshes the connected active lease and billing schedules.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive Lease Workspace */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none">
                
                {/* Header */}
                <div className="px-5 py-4 bg-surface-subtle dark:bg-[#1B2224] border-b border-border/50 dark:border-[#2A3032] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider block">Agreement Database</span>
                    <h3 className="font-heading font-bold text-sm text-foreground mt-0.5">Lease Management</h3>
                  </div>
                  <span className="text-[9px] px-2.5 py-0.5 rounded bg-surface border border-border text-muted">
                    Total: 12 Leases
                  </span>
                </div>

                {/* Lease Database List */}
                <div className="p-5 space-y-3">
                  {leases.map((lease, idx) => {
                    const isActive = lease.status === "Active";
                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/40 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] hover:border-accent/40 dark:hover:border-accent/30 transition-colors gap-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center shrink-0">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="font-heading font-bold text-foreground text-xs">{lease.address}</div>
                            <div className="text-[10px] text-muted mt-0.5">Tenant: {lease.tenantName}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                          <div className="text-left sm:text-right">
                            <div className="font-semibold text-foreground text-[11px]">
                              {lease.startDate !== "-" ? `${lease.startDate} — ${lease.endDate}` : "Unoccupied"}
                            </div>
                            <div className="text-[9px] text-muted mt-0.5">Lease Agreement</div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-heading font-bold uppercase tracking-wider border ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {lease.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
