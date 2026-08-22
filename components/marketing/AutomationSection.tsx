"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowRight } from "lucide-react";
import { NexusDiagram } from "./nexus/NexusDiagram";

export function AutomationSection() {
  const timelineEvents = [
    { time: "08:00", action: "Rent reminders sent", count: "12" },
    { time: "09:15", action: "Lease renewals generated", count: "3" },
    { time: "10:30", action: "Inspections completed", count: "4" },
    { time: "11:45", action: "ATO expenses categorised", count: "28" },
    { time: "14:00", action: "Payment reconciliation", count: "16" },
  ];

  return (
    <div className="dark text-foreground bg-background">
      <section className="py-24 md:py-32 bg-surface-subtle/80 dark:bg-[#071014] text-foreground dark:text-[#F4F1EC] relative overflow-hidden border-y border-border dark:border-[#A9927D]/20 transition-colors duration-300">
        {/* Background Architectural Ambient Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-architectural-grid opacity-30 dark:opacity-20 pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left: Message & Conversion Trigger */}
            <div className="lg:col-span-5 space-y-6">
              <Reveal direction="up" delay={0.1}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border dark:border-accent/30 bg-surface dark:bg-[#0D171B] text-[11px] font-medium tracking-[0.15em] uppercase text-accent font-heading">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span>AUTOMATION</span>
                </div>
              </Reveal>

              <Reveal direction="up" delay={0.2}>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight uppercase leading-[1.1]">
                  Your portfolio, <br />
                  <span className="text-accent">working while</span> <br />
                  you don&apos;t.
                </h2>
              </Reveal>

              <Reveal direction="up" delay={0.3}>
                <p className="text-base sm:text-lg text-muted dark:text-[#A9B1B3] leading-relaxed">
                  PropertyLedge automates the repetitive workflows—from rent
                  reconciliations and arrears notices to compliance renewals—so you
                  can focus on growing your assets.
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.4}>
                <div className="p-5 rounded-2xl border border-border dark:border-accent/20 bg-surface dark:bg-[#0D171B]/90 backdrop-blur-md space-y-3 shadow-subtle-card">
                  <div className="text-xs font-heading font-semibold text-accent uppercase tracking-wider">
                    Get started in minutes
                  </div>
                  <p className="text-xs text-muted dark:text-[#A9B1B3]">
                    No credit card required. Import your properties in less than 5 minutes.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href="#pricing"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
                    >
                      <span>Start Free Trial</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="#pricing"
                      className="text-xs text-muted hover:text-foreground dark:text-[#A9B1B3] dark:hover:text-white transition-colors"
                    >
                      or Book a Demo
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Center: Live Automation Timeline */}
            <div className="lg:col-span-3">
              <Reveal direction="up" delay={0.2} duration={0.8}>
                <div className="p-5 sm:p-6 rounded-2xl border border-border dark:border-accent/20 bg-surface dark:bg-[#0D171B] shadow-mockup space-y-4">
                  <div className="flex items-center justify-between border-b border-border dark:border-[#1A262C] pb-3">
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-accent">
                      Activity Stream
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live System
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    {timelineEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle dark:bg-[#111E23] border border-border/80 dark:border-[#1A2830] hover:border-accent/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-accent font-semibold text-[11px]">{evt.time}</span>
                          <span className="text-foreground dark:text-[#F4F1EC] text-[11px] font-sans">
                            {evt.action}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-accent/15 dark:bg-accent/20 text-accent font-bold text-[10px]">
                          {evt.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right: Living Property Operations Core (Nexus Architecture Diagram) */}
            <div className="lg:col-span-4 flex justify-center items-center">
              <Reveal direction="up" delay={0.3} duration={0.8} className="w-full">
                <NexusDiagram />
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
