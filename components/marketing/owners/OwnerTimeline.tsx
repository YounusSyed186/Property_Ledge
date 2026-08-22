"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { DollarSign, ClipboardCheck, FileText, RefreshCw, Wrench } from "lucide-react";
import { timelineEvents } from "@/lib/owners/owner-data";

export function OwnerTimeline() {
  const getIcon = (type: string) => {
    switch (type) {
      case "rent":
        return DollarSign;
      case "inspection":
        return ClipboardCheck;
      case "invoice":
        return FileText;
      case "renewal":
        return RefreshCw;
      case "maintenance":
        return Wrench;
      default:
        return FileText;
    }
  };

  return (
    <section className="py-24 sm:py-32 bg-background dark:bg-[#0E1112]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text content */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>PROPERTY HISTORY</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Every property has a story. Keep it together.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed font-sans">
                Track every historic event, repair, inspection, payment, and lease signature in a single chronological log. Never lose sight of historic outgoings or agreement updates.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <p className="text-xs text-muted dark:text-[#AEB6B8] leading-relaxed">
                Filter activities by event type or search notes directly. Ideal for year-end calculations or preparation for tenancy changes.
              </p>
            </Reveal>
          </div>

          {/* Right Column: High-fidelity Timeline Visual */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25}>
              <div className="w-full rounded-xl border border-border dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup overflow-hidden text-foreground text-xs select-none p-6">
                
                {/* Header */}
                <div className="border-b border-border/40 dark:border-[#2A3032]/40 pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-foreground">24 Smith Street Ledger</h3>
                    <p className="text-[10px] text-muted mt-0.5">Chronological Activity Log</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-surface-subtle dark:bg-[#1B2224] text-accent border border-border/40 font-bold font-heading uppercase tracking-wide">
                    Live History
                  </span>
                </div>

                {/* Timeline vertical layout */}
                <div className="relative pl-6 space-y-6">
                  {/* Vertical Line */}
                  <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border/50 dark:bg-[#2A3032]" />

                  {timelineEvents.map((event, idx) => {
                    const Icon = getIcon(event.type);
                    return (
                      <div key={idx} className="relative flex gap-4 items-start group">
                        {/* Timeline Node Point */}
                        <div className="absolute -left-6 w-5.5 h-5.5 rounded-full bg-surface dark:bg-[#151A1C] border-2 border-accent flex items-center justify-center text-accent z-10 transition-transform group-hover:scale-110">
                          <Icon className="w-3 h-3" />
                        </div>

                        {/* Date Tag */}
                        <div className="w-16 text-left shrink-0">
                          <span className="text-[9px] font-heading font-bold tracking-wider text-accent uppercase">
                            {event.date}
                          </span>
                        </div>

                        {/* Event details card */}
                        <div className="flex-1 p-3 rounded-lg border border-border/30 dark:border-[#2A3032]/40 bg-surface dark:bg-[#151A1C] group-hover:border-accent/40 transition-colors">
                          <h4 className="font-heading font-bold text-foreground text-xs">{event.title}</h4>
                          <p className="text-[10px] text-muted dark:text-[#AEB6B8] mt-0.5">{event.description}</p>
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
