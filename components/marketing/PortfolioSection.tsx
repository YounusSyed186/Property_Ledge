"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PortfolioDashboard } from "./PortfolioDashboard";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function PortfolioSection() {
  const features = [
    "Portfolio management",
    "Property & tenant management",
    "Occupancy tracking",
    "Team & agent collaboration",
    "Centralized documents",
  ];

  return (
    <section id="platform" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Feature Details */}
          <div className="lg:col-span-5 space-y-6">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel>ONE PORTFOLIO</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase leading-[1.1]">
                One portfolio. <br />
                <span className="text-accent">One operating system.</span>
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-base sm:text-lg text-muted leading-relaxed">
                Everything you need to manage your portfolio from one central,
                intelligent workspace. Keep full visibility across every tenancy,
                maintenance request and lease cycle.
              </p>
            </Reveal>

            {/* Checkmark List */}
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

          {/* Right Product Mockup */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25} duration={0.8}>
              <PortfolioDashboard />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
