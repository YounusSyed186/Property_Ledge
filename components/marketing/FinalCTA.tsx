"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCTA() {
  return (
    <div className="dark text-foreground bg-background">
      <section className="py-24 md:py-32 bg-surface-subtle dark:bg-[#071014] text-foreground dark:text-[#F4F1EC] relative overflow-hidden border-t border-border dark:border-[#A9927D]/20 transition-colors duration-300">
      {/* Background Architectural Glow & Linework */}
      <div className="absolute inset-0 bg-architectural-grid opacity-30 dark:opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center space-y-8 relative z-10">
        <Reveal direction="up" delay={0.1}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border dark:border-accent/30 bg-surface dark:bg-[#0D171B] text-[11px] font-medium tracking-[0.15em] uppercase text-accent font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>TAKE CONTROL OF YOUR PORTFOLIO</span>
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.2}>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading tracking-tight uppercase leading-[1.05]">
            Ready to run <br />
            <span className="text-accent">your portfolio</span> better?
          </h2>
        </Reveal>

        <Reveal direction="up" delay={0.3}>
          <p className="text-base sm:text-lg text-muted dark:text-[#A9B1B3] max-w-xl mx-auto leading-relaxed">
            Join Australian property managers and landlords switching to a unified,
            intelligent property operating system.
          </p>
        </Reveal>

        <Reveal direction="up" delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              href="#pricing"
              variant="accent"
              size="lg"
              withArrow
              className="w-full sm:w-auto"
            >
              Start Free Trial
            </Button>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-border dark:border-accent/30 hover:border-accent text-sm font-medium text-foreground dark:text-[#F4F1EC] bg-surface dark:bg-[#0D171B] hover:bg-surface-subtle dark:hover:bg-[#111E23] transition-colors w-full sm:w-auto"
            >
              Book a Demo
            </a>
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.5}>
          <p className="text-xs text-muted dark:text-[#A9B1B3]/70 pt-2">
            14-day free trial • No credit card required • 5-minute setup
          </p>
        </Reveal>
      </div>
    </section>
  </div>
  );
}
