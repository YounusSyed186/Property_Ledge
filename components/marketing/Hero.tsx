"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProductDashboard } from "./ProductDashboard";
import { Reveal } from "@/components/ui/Reveal";
import { Star } from "lucide-react";

export function Hero() {
  const avatars = [
    { initials: "JM", bg: "bg-emerald-800 text-emerald-100" },
    { initials: "SR", bg: "bg-amber-800 text-amber-100" },
    { initials: "LK", bg: "bg-stone-700 text-stone-100" },
    { initials: "AT", bg: "bg-teal-800 text-teal-100" },
  ];

  return (
    <section className="relative pt-32 sm:pt-36 pb-20 md:pb-28 overflow-hidden bg-background">
      {/* Right-Side Architectural Background Images (Dark & Light mode) */}
      <div className="absolute top-0 right-0 w-full lg:w-[68%] h-full pointer-events-none z-0 overflow-hidden">
        {/* Dark Mode BG Image */}
        <img
          src="/images/HeroBG_Dark.png"
          alt="Property Architecture"
          className="hidden dark:block w-full h-full object-cover object-right opacity-60 lg:opacity-90 transition-opacity duration-500 scale-105"
        />
        {/* Light Mode BG Image */}
        <img
          src="/images/HeroBG_Light.png"
          alt="Property Architecture"
          className="block dark:hidden w-full h-full object-cover object-right opacity-90 lg:opacity-100 transition-opacity duration-500 scale-105"
        />
        {/* Gradient Overlays for Seamless Left Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 dark:via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      {/* Background Architectural Grid & Subtle Radial Glow */}
      <div className="absolute inset-0 bg-architectural-grid opacity-40 pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-[500px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Headline & Messaging */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <SectionLabel>ALL-IN-ONE PLATFORM</SectionLabel>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h1 className="text-4xl sm:text-5xl lg:text-[62px] xl:text-[68px] font-bold font-heading tracking-tight leading-[1.05] text-foreground uppercase">
                Property <br />
                Management, <br />
                <span className="text-accent font-extrabold">Without</span> <br />
                <span className="text-accent font-extrabold">The Admin.</span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-base sm:text-lg text-muted max-w-md leading-relaxed">
                The operating platform for Australian landlords, property managers and
                agencies. Manage leases, rent, inspections and financial reporting from
                one intelligent workspace.
              </p>
            </Reveal>

            {/* Action Buttons */}
            <Reveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Button href="/signup" variant="primary" size="lg" withArrow>
                  Start Free Trial
                </Button>
                <Button href="#platform" variant="secondary" size="lg">
                  Explore the Platform
                </Button>
              </div>
            </Reveal>

            {/* Trust Social Proof */}
            <Reveal direction="up" delay={0.5}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-border/60">
                <div className="flex -space-x-2">
                  {avatars.map((a, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full ${a.bg} border-2 border-background flex items-center justify-center text-[10px] font-bold shadow-xs`}
                    >
                      {a.initials}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted">
                    Trusted by property professionals across Australia
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Realistic Dashboard Mockup + Architectural Framing */}
          <div className="lg:col-span-7">
            <Reveal direction="up" delay={0.25} duration={0.8}>
              <div className="relative">
                {/* Product UI Dashboard */}
                <ProductDashboard />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
