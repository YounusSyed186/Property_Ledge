"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FinancialDashboard } from "./FinancialDashboard";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function FinancialSection() {
  const features = [
    "ATO-ready expense tracking",
    "Instant profit & loss reports",
    "Tax time made painless",
    "Export & integrate instantly",
  ];

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left: Text & Features */}
          <div className="lg:col-span-5 space-y-6">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel>FINANCIAL REPORTING</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase leading-[1.1]">
                Know where <br />
                <span className="text-accent">every dollar went.</span>
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-base sm:text-lg text-muted leading-relaxed">
                Automated categorisation, ATO-ready records and instant financial
                reporting. Generate tax summaries, profit & loss statements and cash
                flow analysis in one click.
              </p>
            </Reveal>

            <StaggerContainer className="space-y-3 pt-2">
              {features.map((feature, idx) => (
                <StaggerItem key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{feature}</span>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Right: Interactive Financial Dashboard Mockup */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25} duration={0.8}>
              <FinancialDashboard />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
