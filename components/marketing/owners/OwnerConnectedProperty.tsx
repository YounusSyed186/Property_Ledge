"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Building2, Users, FileText, DollarSign, BarChart3 } from "lucide-react";

export function OwnerConnectedProperty() {
  return (
    <section className="py-24 sm:py-32 bg-surface/30 dark:bg-[#151A1C]/20 border-y border-border/50 dark:border-[#2A3032]/50">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel dot>CONNECTED INFRASTRUCTURE</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
              One property. Everything connected.
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.3}>
            <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] max-w-md mx-auto leading-relaxed font-sans">
              PropertyLedge builds a clean, relational property record where every tenant, lease renewal, and rent transaction maps back to the core ledger.
            </p>
          </Reveal>
        </div>

        {/* Architectural Systems Diagram */}
        <Reveal direction="up" delay={0.25}>
          <div className="relative w-full max-w-3xl mx-auto rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none p-8 flex flex-col items-center">
            
            {/* SVG Background Connections */}
            <div className="absolute inset-0 w-full h-full pointer-events-none hidden md:block">
              <svg viewBox="0 0 700 350" fill="none" className="w-full h-full stroke-accent/40 dark:stroke-accent/20">
                {/* Center Main Node down-left, down-center, down-right */}
                <path d="M 350 70 L 150 140" strokeWidth="1.5" />
                <path d="M 350 70 L 350 140" strokeWidth="1.5" />
                <path d="M 350 70 L 550 140" strokeWidth="1.5" />
                
                {/* Sub layer vertical connections */}
                <path d="M 150 170 L 150 230" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 350 170 L 350 230" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 550 170 L 550 230" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Sub layer converging to bottom reporting */}
                <path d="M 150 260 L 350 310" strokeWidth="1.5" />
                <path d="M 350 260 L 350 310" strokeWidth="1.5" />
                <path d="M 550 260 L 350 310" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Layout Nodes */}
            <div className="w-full space-y-12 relative z-10">
              
              {/* Level 1: Core Property Node */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-accent bg-surface dark:bg-[#151A1C] text-center w-52 shadow-md hover:scale-[1.02] transition-transform">
                  <div className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center mb-2 shadow">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-heading">Core Property</span>
                  <div className="font-heading font-bold text-xs text-foreground mt-0.5">24 Smith Street</div>
                </div>
              </div>

              {/* Level 2: Middle Branch Nodes (Tenant, Lease, Finance) */}
              <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-0 max-w-full">
                
                {/* Tenant Node */}
                <div className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] text-center w-full md:w-40 shadow-sm hover:scale-[1.02] transition-transform">
                  <div className="w-7 h-7 rounded-full bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center mb-1.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider font-heading">TENANT</span>
                  <div className="font-heading font-bold text-[11px] text-foreground mt-0.5">Sarah Williams</div>
                </div>

                {/* Lease Node */}
                <div className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] text-center w-full md:w-40 shadow-sm hover:scale-[1.02] transition-transform">
                  <div className="w-7 h-7 rounded-full bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center mb-1.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider font-heading">LEASE</span>
                  <div className="font-heading font-bold text-[11px] text-foreground mt-0.5">Active Agreement</div>
                </div>

                {/* Finance Node */}
                <div className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-border/80 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] text-center w-full md:w-40 shadow-sm hover:scale-[1.02] transition-transform">
                  <div className="w-7 h-7 rounded-full bg-surface-subtle dark:bg-[#1B2224] text-accent flex items-center justify-center mb-1.5">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider font-heading">FINANCE</span>
                  <div className="font-heading font-bold text-[11px] text-foreground mt-0.5">$48,240 / mo</div>
                </div>
              </div>

              {/* Level 3: Sub Branches */}
              <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-0 max-w-full">
                
                {/* Contact details */}
                <div className="p-3 rounded-lg border border-border/40 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] text-center w-full md:w-40">
                  <span className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider font-heading block">CONTACT</span>
                  <span className="text-[10px] font-semibold text-foreground block mt-0.5">sarah.w@example.com</span>
                </div>

                {/* Dates / Status */}
                <div className="p-3 rounded-lg border border-border/40 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] text-center w-full md:w-40">
                  <span className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider font-heading block">STATUS</span>
                  <span className="text-[10px] font-semibold text-foreground block mt-0.5">12 Feb 26 — 11 Feb 27</span>
                </div>

                {/* Expenses */}
                <div className="p-3 rounded-lg border border-border/40 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] text-center w-full md:w-40">
                  <span className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider font-heading block">OUTGOINGS</span>
                  <span className="text-[10px] font-semibold text-accent block mt-0.5">Insured &amp; Audited</span>
                </div>
              </div>

              {/* Level 4: Converged Reporting Node */}
              <div className="flex justify-center pt-2">
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-foreground bg-foreground text-background dark:border-foreground dark:bg-foreground dark:text-background text-center w-52 shadow hover:scale-[1.02] transition-transform">
                  <BarChart3 className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-[10px] font-bold font-heading uppercase tracking-wider">RECONCILED REPORTING</span>
                </div>
              </div>

            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
