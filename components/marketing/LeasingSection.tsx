"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LeaseDocument } from "./LeaseDocument";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function LeasingSection() {
  const features = [
    "State-specific compliant lease templates",
    "Legally binding digital signatures",
    "Automated tenant email & SMS invitations",
    "Encrypted cloud document storage & auditing",
  ];

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left: Copy & Details */}
          <div className="lg:col-span-5 space-y-6">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel>DIGITAL LEASING</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase leading-[1.1]">
                From agreement <br />
                <span className="text-accent">to signature.</span>
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-base sm:text-lg text-muted leading-relaxed">
                Create, send and sign legally binding residential and commercial
                tenancy agreements without printing or scanning a single sheet of paper.
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

          {/* Right: Lease Document UI & Workflow */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25} duration={0.8}>
              <LeaseDocument />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
