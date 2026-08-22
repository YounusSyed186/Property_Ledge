"use client";

import React from "react";
import { CheckCircle2, Camera, ArrowRight } from "lucide-react";

export function InspectionPhone() {
  const items = [
    { name: "Exterior", status: "Checked" },
    { name: "Kitchen", status: "Checked" },
    { name: "Bathroom", status: "Checked" },
    { name: "Bedroom", status: "Checked" },
    { name: "Safety Compliance", status: "Compliant" },
  ];

  return (
    <div className="relative mx-auto max-w-[280px] sm:max-w-[300px] rounded-[36px] border-[6px] border-foreground/80 dark:border-foreground/30 bg-surface shadow-2xl p-4 text-foreground select-none">
      {/* Top Speaker / Dynamic Island Notch */}
      <div className="w-24 h-4 bg-foreground/90 dark:bg-foreground/40 rounded-full mx-auto mb-4 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-surface/40 mr-2" />
        <div className="w-1.5 h-1.5 rounded-full bg-surface/30" />
      </div>

      {/* Phone Screen Content */}
      <div className="space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div>
            <span className="text-[10px] text-accent uppercase font-bold tracking-wider">
              Routine Inspection
            </span>
            <div className="font-heading font-bold text-sm text-foreground">
              12 Anderson Street
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
            In Progress
          </span>
        </div>

        {/* Room Checklist */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle/50 hover:bg-surface-subtle transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-foreground text-[11px]">{item.name}</span>
              </div>
              <span className="text-[10px] text-muted">{item.status}</span>
            </div>
          ))}
        </div>

        {/* Photos Upload Count */}
        <div className="p-3 rounded-xl border border-border bg-surface-subtle/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-accent" />
            <div>
              <div className="text-[11px] font-semibold text-foreground">Photos Attached</div>
              <div className="text-[10px] text-muted">High-res timestamped</div>
            </div>
          </div>
          <span className="text-xs font-bold font-heading text-foreground">24 / 24</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="w-full py-2.5 px-3 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-2 hover:bg-foreground/90 transition-all active:scale-[0.98]"
        >
          <span>Generate Report</span>
          <ArrowRight className="w-3.5 h-3.5 text-accent" />
        </button>
      </div>

      {/* Bottom Bar indicator */}
      <div className="w-28 h-1 bg-foreground/20 rounded-full mx-auto mt-4" />
    </div>
  );
}
