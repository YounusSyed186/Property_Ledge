"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { InspectionPhone } from "./InspectionPhone";
import { ArchitecturalFacadeVisual } from "./ArchitecturalVisual";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function InspectionSection() {
  const features = [
    "Mobile inspections on iOS & Android",
    "Photo & fixture capture with timestamps",
    "State-compliant custom templates",
    "Instant PDF report generation & sharing",
  ];

  return (
    <section className="py-20 md:py-28 bg-surface/30 border-y border-border/70 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left: Smartphone Inspection Mockup */}
          <div className="lg:col-span-4 flex justify-center">
            <Reveal direction="up" delay={0.1} duration={0.8}>
              <InspectionPhone />
            </Reveal>
          </div>

          {/* Center: Copy & Features */}
          <div className="lg:col-span-4 space-y-6">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel>INSPECTIONS</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase leading-[1.1]">
                Inspect. <br />
                Document. <br />
                <span className="text-accent">Done.</span>
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-base text-muted leading-relaxed">
                Complete property inspections on the go and generate professional,
                audit-ready reports in minutes directly from your smartphone or
                tablet.
              </p>
            </Reveal>

            <StaggerContainer className="space-y-3 pt-2">
              {features.map((feature, idx) => (
                <StaggerItem key={idx} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {feature}
                  </span>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Right: Architectural Property Visual */}
          <div className="lg:col-span-4">
            <Reveal direction="up" delay={0.25} duration={0.8}>
              <ArchitecturalFacadeVisual className="h-64 sm:h-80 w-full" />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
