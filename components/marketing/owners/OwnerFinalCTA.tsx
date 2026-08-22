"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck } from "lucide-react";

export function OwnerFinalCTA() {
  return (
    <section className="py-24 sm:py-32 bg-[#0E1112] text-[#F2F4F3] border-t border-[#2A3032] relative overflow-hidden">
      {/* Subtle background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: CTA Pitch */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <Reveal direction="up" delay={0.1}>
              <span className="text-[10px] uppercase font-bold tracking-widest text-accent font-heading">
                BUILT FOR PROPERTY OWNERS
              </span>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-bold font-heading tracking-tight leading-[1.08] uppercase text-white">
                Spend less time managing your properties. <br />
                <span className="text-[#A9927D]">Spend more time owning them.</span>
              </h2>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              <p className="text-sm sm:text-base text-[#AEB6B8] max-w-md leading-relaxed font-sans">
                Bring your property portfolio, leases, rental activity, inspections and financial records together in one place. Save hours of administrative overhead and obtain absolute clarity over your operations.
              </p>
            </Reveal>

            {/* Buttons */}
            <Reveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Button href="/signup" variant="accent" size="lg" withArrow>
                  Start Free Trial
                </Button>
                <Button href="/#platform" variant="outline" size="lg" className="border-[#2A3032] text-white hover:bg-[#1B2224] hover:text-[#A9927D]">
                  See How It Works →
                </Button>
              </div>
            </Reveal>

            {/* Micro reassurance checklist */}
            <Reveal direction="up" delay={0.5}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-[#AEB6B8] font-heading font-medium tracking-wide uppercase pt-4 border-t border-[#2A3032]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Custom luxury dusk house facade SVG */}
          <div className="lg:col-span-6">
            <Reveal direction="up" delay={0.25}>
              <div className="relative overflow-hidden rounded-xl border border-[#2A3032] bg-[#151A1C] shadow-2xl aspect-[4/3] w-full max-w-lg mx-auto">
                <svg
                  viewBox="0 0 800 600"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full object-cover opacity-60 transition-transform duration-700 hover:scale-[1.02]"
                >
                  <defs>
                    <linearGradient id="skyGradCta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B1317" />
                      <stop offset="100%" stopColor="#05080A" />
                    </linearGradient>
                    <linearGradient id="concreteCta" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#252D32" />
                      <stop offset="100%" stopColor="#12181C" />
                    </linearGradient>
                    <linearGradient id="warmGlowCta" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E2C197" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#A9927D" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient id="timberCta" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#A9927D" />
                      <stop offset="100%" stopColor="#706051" />
                    </linearGradient>
                  </defs>

                  {/* Backdrop */}
                  <rect width="800" height="600" fill="url(#skyGradCta)" />

                  {/* Minimal Landscaping */}
                  <ellipse cx="120" cy="560" rx="100" ry="50" fill="#05080A" />
                  <ellipse cx="680" cy="550" rx="120" ry="60" fill="#05080A" />

                  {/* Cantilever Facade Structure */}
                  <path d="M 100 220 L 700 220 L 700 420 L 100 420 Z" fill="url(#concreteCta)" />
                  <rect x="80" y="200" width="640" height="20" fill="#0F1417" />

                  {/* Upper Windows & Warm Interior Glow */}
                  <rect x="150" y="250" width="240" height="140" fill="url(#warmGlowCta)" opacity="0.7" rx="2" />
                  <line x1="230" y1="250" x2="230" y2="390" stroke="#0F1417" strokeWidth="3" />
                  <line x1="310" y1="250" x2="310" y2="390" stroke="#0F1417" strokeWidth="3" />

                  {/* Timber Slat Accent Panel */}
                  <rect x="420" y="240" width="120" height="160" fill="url(#timberCta)" rx="2" />
                  {[430, 442, 454, 466, 478, 490, 502, 514, 526].map((x) => (
                    <line key={x} x1={x} y1="240" x2={x} y2="400" stroke="#483B30" strokeWidth="2.5" />
                  ))}

                  {/* Glass Panel Suite */}
                  <rect x="560" y="250" width="100" height="140" fill="#24343D" opacity="0.4" rx="2" />

                  {/* Ground floor Base */}
                  <rect x="140" y="420" width="520" height="180" fill="#0F1517" />
                  <rect x="440" y="440" width="140" height="160" fill="url(#warmGlowCta)" opacity="0.8" rx="2" />
                  <line x1="510" y1="440" x2="510" y2="600" stroke="#0A0E10" strokeWidth="4" />

                  {/* Pathway & Ground Pool reflection */}
                  <polygon points="50,580 750,580 680,540 120,540" fill="#1C252A" />
                </svg>

                {/* Status indicator box */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-lg bg-[#0E1112]/90 backdrop-blur-md border border-[#2A3032] text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="font-semibold text-white">System Status Online</span>
                  </div>
                  <span className="text-accent font-bold uppercase tracking-wider">PropertyLedge Cloud</span>
                </div>
              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
