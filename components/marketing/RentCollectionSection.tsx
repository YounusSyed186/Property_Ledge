"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RentInvoice } from "./RentInvoice";
import { LuxuryInteriorVisual } from "./ArchitecturalVisual";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function RentCollectionSection() {
  const features = [
    "Automated invoicing",
    "Online payments & receipts",
    "Smart reminders",
    "Automatic ledger updates",
  ];

  return (
    <section className="py-20 md:py-28 bg-surface/30 border-y border-border/70 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left: Rent Invoice UI & Workflow Steps */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.1} duration={0.8}>
              <RentInvoice />
            </Reveal>
          </div>

          {/* Right: Copy + Feature Details + Architectural Interior */}
          <div className="lg:col-span-5 space-y-6">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel>RENT COLLECTION</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase leading-[1.1]">
                Get paid <br />
                <span className="text-accent">without chasing.</span>
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-base sm:text-lg text-muted leading-relaxed">
                Automated rent collection, smart reminders and real-time payment
                tracking without the manual follow-up. Let the platform handle
                arrears notifications automatically.
              </p>
            </Reveal>

            {/* Features list */}
            <StaggerContainer className="space-y-2.5 pt-1">
              {features.map((item, idx) => (
                <StaggerItem key={idx} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {item}
                  </span>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Architectural Interior Visual */}
            <Reveal direction="up" delay={0.4}>
              <div className="pt-2">
                <LuxuryInteriorVisual className="h-44 sm:h-52 w-full" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
