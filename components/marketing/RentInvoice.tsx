"use client";

import React from "react";
import { Download, CheckCircle2, FileText } from "lucide-react";

export function RentInvoice() {
  const steps = [
    { title: "Rent Due", desc: "05 Aug 2026" },
    { title: "Invoice Generated", desc: "Automatically created" },
    { title: "Tenants Notified", desc: "Email & SMS sent" },
    { title: "Payment Received", desc: "Online payment" },
    { title: "Ledger Updated", desc: "Records reconciled" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Rent Invoice Card */}
      <div className="md:col-span-6 rounded-2xl border border-border bg-surface shadow-mockup p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <span className="font-heading font-bold text-xs tracking-tight text-foreground">
              Rent Invoice #INV-0042
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            PAID
          </span>
        </div>

        <div>
          <div className="text-[10px] uppercase font-medium text-muted">Amount Due</div>
          <div className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            $4,280.00
          </div>
          <div className="text-[11px] text-muted mt-0.5">Due: 05 Aug 2026</div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Tenant</span>
            <span className="font-medium text-foreground">Sarah Parker</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Property</span>
            <span className="font-medium text-foreground">12 Anderson Street, Sydney</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Period</span>
            <span className="font-medium text-foreground">01 Aug 2026 – 31 Aug 2026</span>
          </div>
        </div>

        <button
          type="button"
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-surface-subtle hover:bg-surface-subtle/80 border border-border text-foreground font-medium text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-accent" />
          <span>Download Invoice</span>
        </button>
      </div>

      {/* Vertical Animated Workflow */}
      <div className="md:col-span-6 space-y-3.5 pl-2 sm:pl-4">
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex items-start gap-3 group">
            {idx < steps.length - 1 && (
              <div className="absolute top-6 left-2.5 bottom-0 w-[1px] bg-border group-hover:bg-accent/40 transition-colors" />
            )}
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 z-10">
              <CheckCircle2 className="w-3 h-3" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground font-heading">
                {step.title}
              </div>
              <div className="text-[11px] text-muted">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
