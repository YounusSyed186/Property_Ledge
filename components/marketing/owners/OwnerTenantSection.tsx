"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Mail, Phone, Calendar, DollarSign, ShieldAlert } from "lucide-react";
import { tenants } from "@/lib/owners/owner-data";

export function OwnerTenantSection() {
  const tenant = tenants[0];

  return (
    <section className="py-24 sm:py-32 bg-surface/30 dark:bg-[#151A1C]/20 border-y border-border/50 dark:border-[#2A3032]/50">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Tenant profile card visual */}
          <div className="lg:col-span-7 order-last lg:order-first">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full max-w-md mx-auto rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none">
                
                {/* Header */}
                <div className="px-5 py-4 bg-surface-subtle dark:bg-[#1B2224] border-b border-border/50 dark:border-[#2A3032] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-[10px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider">Tenant Profile</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-heading font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {tenant.status}
                  </span>
                </div>

                {/* Profile detail */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center font-heading font-bold text-sm">
                      SW
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm text-foreground">{tenant.name}</h3>
                      <p className="text-[10px] text-muted mt-0.5">{tenant.location}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/40 dark:border-[#2A3032]/40 pt-4 space-y-3.5 text-[11px]">
                    <div className="flex justify-between items-center pb-2 border-b border-border/20 dark:border-[#2A3032]/20">
                      <div className="flex items-center gap-2 text-muted dark:text-[#AEB6B8]">
                        <Mail className="w-3.5 h-3.5 text-accent" />
                        <span>Email</span>
                      </div>
                      <span className="font-semibold text-foreground">sarah.w@example.com</span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/20 dark:border-[#2A3032]/20">
                      <div className="flex items-center gap-2 text-muted dark:text-[#AEB6B8]">
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <span>Phone</span>
                      </div>
                      <span className="font-semibold text-foreground">+61 491 570 156</span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/20 dark:border-[#2A3032]/20">
                      <div className="flex items-center gap-2 text-muted dark:text-[#AEB6B8]">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>Active Lease</span>
                      </div>
                      <span className="font-semibold text-foreground">{tenant.leaseRange}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-muted dark:text-[#AEB6B8]">
                        <DollarSign className="w-3.5 h-3.5 text-accent" />
                        <span>Weekly Equivalent</span>
                      </div>
                      <span className="font-semibold text-foreground">{tenant.rent}</span>
                    </div>
                  </div>
                </div>

              </div>
            </Reveal>
          </div>

          {/* Right Column: Text description */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>TENANT MANAGEMENT</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Know who lives in every property.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed">
                Connect directly with your renters. Maintain complete logs of contact details, payment schedules, maintenance inquiries, and histories in a clean, professional profile console.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <div className="p-4 border border-border/40 dark:border-[#2A3032]/40 rounded-xl bg-surface dark:bg-[#151A1C] flex gap-3">
                <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-heading text-foreground uppercase tracking-wide">Privacy First</h4>
                  <p className="text-[10px] text-muted dark:text-[#AEB6B8] mt-0.5 leading-snug">
                    Communication channels are encrypted and secure, keeping all interactions focused, archival, and structured.
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
