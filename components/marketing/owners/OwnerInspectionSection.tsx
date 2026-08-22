"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Camera, CheckCircle2 } from "lucide-react";

export function OwnerInspectionSection() {
  const checkItems = [
    { name: "Walls & Paint", status: "Checked" },
    { name: "Appliances & Power", status: "Checked" },
    { name: "Flooring & Carpets", status: "Checked" },
    { name: "Fixtures & Plumbing", status: "Checked" }
  ];

  return (
    <section className="py-24 sm:py-32 bg-background dark:bg-[#0E1112]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text description */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel dot>INSPECTIONS</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
                Know the condition of your property — even when you're not there.
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-muted dark:text-[#AEB6B8] leading-relaxed">
                Conduct digital inspection walks, complete check-items, and upload timestamped high-resolution photos. Generate professional condition reports directly on site.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              <div className="space-y-4">
                <div className="flex gap-3 items-center text-xs font-bold font-heading text-foreground uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Routine reports generated on the spot</span>
                </div>
                <div className="flex gap-3 items-center text-xs font-bold font-heading text-foreground uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Audit-proof photo documentation</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Custom high-fidelity mobile inspection mockup */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25}>
              <div className="relative mx-auto max-w-[280px] sm:max-w-[300px] rounded-[36px] border-[6px] border-foreground/90 dark:border-[#2A3032] bg-surface dark:bg-[#151A1C] shadow-mockup p-4 text-foreground select-none">
                
                {/* Phone Speaker Dynamic Island Notch */}
                <div className="w-24 h-4 bg-foreground/95 dark:bg-[#2A3032] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-surface/40 mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface/30" />
                </div>

                {/* Internal Screen Content */}
                <div className="space-y-4 text-[11px]">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border/40 dark:border-[#2A3032]/40 pb-2.5">
                    <div>
                      <span className="text-[9px] text-accent uppercase font-bold tracking-wider block font-heading">
                        Property Inspection
                      </span>
                      <div className="font-heading font-bold text-xs text-foreground">
                        24 Smith Street
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                      Complete
                    </span>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider px-0.5">
                      Kitchen Areas
                    </div>
                    {checkItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle/50 dark:bg-[#1B2224] hover:bg-surface-subtle transition-colors border border-border/20 dark:border-[#2A3032]/25"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium text-foreground text-[10px]">{item.name}</span>
                        </div>
                        <span className="text-[9px] text-muted dark:text-[#AEB6B8]">{item.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* Photos Grid Mockup */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-muted dark:text-[#AEB6B8] uppercase tracking-wider px-0.5 flex items-center justify-between">
                      <span>Inspection Photos</span>
                      <span className="text-accent">24 Files</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Photo Thumbnail 1 */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-accent/20 to-accent/40 border border-border/30 dark:border-[#2A3032]/40 relative overflow-hidden flex items-center justify-center">
                        <Camera className="w-4 h-4 text-accent/60" />
                        <div className="absolute bottom-1 right-1 text-[8px] bg-foreground/80 dark:bg-foreground/50 text-background px-1 rounded-sm">11:05</div>
                      </div>
                      {/* Photo Thumbnail 2 */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-[#A9927D]/30 to-[#8C745F]/30 border border-border/30 dark:border-[#2A3032]/40 relative overflow-hidden flex items-center justify-center">
                        <Camera className="w-4 h-4 text-[#A9927D]/60" />
                        <div className="absolute bottom-1 right-1 text-[8px] bg-foreground/80 dark:bg-foreground/50 text-background px-1 rounded-sm">11:09</div>
                      </div>
                      {/* Photo Thumbnail 3 */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-surface-subtle to-muted/20 border border-border/30 dark:border-[#2A3032]/40 relative overflow-hidden flex items-center justify-center">
                        <Camera className="w-4 h-4 text-muted/40" />
                        <div className="absolute bottom-1 right-1 text-[8px] bg-foreground/80 dark:bg-foreground/50 text-background px-1 rounded-sm">11:12</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    className="w-full py-2.5 px-3 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-foreground/90 transition-all active:scale-[0.98] border border-border/40 dark:border-[#2A3032]"
                  >
                    <span>Inspection Complete</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  </button>
                </div>

                {/* Bottom Bar indicator */}
                <div className="w-28 h-1 bg-foreground/20 rounded-full mx-auto mt-4" />
              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
