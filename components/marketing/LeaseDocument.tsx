"use client";

import React from "react";
import { FileCheck2, CheckCircle2 } from "lucide-react";

export function LeaseDocument() {
  const steps = [
    { title: "Lease Created", desc: "Agreement drafted" },
    { title: "Tenant Invited", desc: "Email invitation sent" },
    { title: "Document Viewed", desc: "Tenant reviewed lease" },
    { title: "Digitally Signed", desc: "Legally binding" },
    { title: "Lease Active", desc: "Stored & secured" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Tenancy Agreement Card */}
      <div className="md:col-span-7 rounded-2xl border border-border bg-surface shadow-mockup p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-accent" />
            <span className="font-heading font-bold text-xs tracking-tight text-foreground">
              Tenancy Agreement
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Fully Executed
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Property</span>
            <span className="font-medium text-foreground">12 Anderson Street, Sydney</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Tenant</span>
            <span className="font-medium text-foreground">Sarah Parker</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Lease Term</span>
            <span className="font-medium text-foreground">12 Months</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Period</span>
            <span className="font-medium text-foreground">05 Aug 2026 – 04 Aug 2027</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted">Rent</span>
            <span className="font-bold text-foreground">$2,400 / month</span>
          </div>
        </div>

        {/* Digital Signatures Box */}
        <div className="pt-2 border-t border-border/60">
          <div className="text-[10px] uppercase font-semibold text-muted mb-2">
            Signed by:
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-surface-subtle/50 border border-border/60 text-center">
              <svg viewBox="0 0 140 40" className="w-28 h-7 mx-auto stroke-[#1b365d] dark:stroke-[#93c5fd] fill-none">
                {/* S */}
                <path
                  d="M 14 24 C 10 18 12 9 20 9 C 28 9 22 19 16 22 C 12 24 20 28 28 25"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dot */}
                <circle cx="33" cy="24" r="1.2" fill="currentColor" className="text-[#1b365d] dark:text-[#93c5fd]" />
                {/* P */}
                <path
                  d="M 40 27 L 43 10 C 45 7 57 7 55 16 C 53 22 42 19 48 19"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* arker cursive flow */}
                <path
                  d="M 48 19 C 52 21 54 25 59 24 C 63 23 64 19 67 22 C 70 24 72 19 74 23 C 76 26 77 13 79 23 C 81 24 85 20 88 21 C 91 22 95 20 99 23 T 107 21"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Bottom flourish underline */}
                <path
                  d="M 16 30 Q 58 35 110 26"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
              <div className="text-[9px] text-muted border-t border-border/50 pt-1 mt-1 font-medium">
                Tenant: Sarah Parker
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-subtle/50 border border-border/60 text-center">
              <svg viewBox="0 0 140 40" className="w-28 h-7 mx-auto stroke-[#1b365d] dark:stroke-[#93c5fd] fill-none">
                {/* J / M loop flourish */}
                <path
                  d="M 12 13 C 18 5 30 5 24 17 C 18 26 10 30 16 32 C 22 34 28 21 34 21"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dot */}
                <circle cx="38" cy="22" r="1.2" fill="currentColor" className="text-[#1b365d] dark:text-[#93c5fd]" />
                {/* H / D cursive flow */}
                <path
                  d="M 44 25 L 48 8 C 50 6 62 9 58 18 C 54 25 44 23 54 23 C 60 23 64 17 68 23 C 72 27 74 17 77 22 C 81 26 83 11 86 24 C 89 25 94 20 101 23"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Flourish sweep */}
                <path
                  d="M 14 27 C 44 21 78 33 112 22"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
              <div className="text-[9px] text-muted border-t border-border/50 pt-1 mt-1 font-medium">
                Property Manager
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Lease Workflow */}
      <div className="md:col-span-5 space-y-3 pl-2 sm:pl-4">
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
