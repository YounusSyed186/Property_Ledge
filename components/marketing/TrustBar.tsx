"use client";

import React from "react";
import { Reveal } from "./Reveal";

// SVG Logos for Australian Property Ecosystem Integrations

function REAGroupLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 40"
      fill="currentColor"
      className={className}
      aria-label="REA Group Logo"
    >
      <rect x="2" y="8" width="24" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M 8 18 L 14 12 L 20 18 V 26 H 8 Z" fill="currentColor" />
      <text x="34" y="27" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="800" fontSize="20" letterSpacing="0.05em">
        REA
      </text>
      <text x="82" y="27" fontFamily="var(--font-outfit), sans-serif" fontWeight="600" fontSize="15" letterSpacing="0.12em" opacity="0.85">
        GROUP
      </text>
    </svg>
  );
}

function RealestateLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 210 40"
      fill="currentColor"
      className={className}
      aria-label="realestate.com.au Logo"
    >
      <g transform="translate(2, 6)">
        <path d="M 14 0 L 28 12 H 23 V 26 H 5 V 12 H 0 Z" fill="currentColor" />
        <rect x="10" y="14" width="8" height="12" className="fill-white dark:fill-[#090909]" />
      </g>
      <text x="36" y="25" fontFamily="var(--font-outfit), sans-serif" fontWeight="700" fontSize="16" letterSpacing="-0.02em">
        realestate
      </text>
      <text x="122" y="25" fontFamily="var(--font-outfit), sans-serif" fontWeight="400" fontSize="13" opacity="0.8">
        .com.au
      </text>
    </svg>
  );
}

function DomainLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 150 40"
      fill="currentColor"
      className={className}
      aria-label="Domain Logo"
    >
      <g transform="translate(2, 8)">
        <rect width="24" height="24" rx="4" fill="currentColor" />
        <path d="M 7 7 H 13 C 16 7 18 9 18 12 C 18 15 16 17 13 17 H 7 V 7 Z" className="fill-white dark:fill-[#090909]" />
      </g>
      <text x="34" y="27" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="700" fontSize="21" letterSpacing="-0.03em">
        Domain
      </text>
    </svg>
  );
}

function ATOLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 40"
      fill="currentColor"
      className={className}
      aria-label="Australian Taxation Office Logo"
    >
      <g transform="translate(2, 6)">
        <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M 9 14 C 9 9 19 9 19 14 C 19 19 9 19 9 14 Z" fill="currentColor" />
        <circle cx="14" cy="7" r="2" fill="currentColor" />
      </g>
      <text x="36" y="20" fontFamily="var(--font-outfit), sans-serif" fontWeight="700" fontSize="14" letterSpacing="0.02em">
        Australian Government
      </text>
      <text x="36" y="32" fontFamily="var(--font-outfit), sans-serif" fontWeight="500" fontSize="11" opacity="0.8" letterSpacing="0.04em">
        Australian Taxation Office
      </text>
    </svg>
  );
}

function FairTradingLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 40"
      fill="currentColor"
      className={className}
      aria-label="Queensland Office of Fair Trading Logo"
    >
      <g transform="translate(2, 6)">
        <path d="M 14 2 L 26 8 V 18 C 26 24 14 28 14 28 C 14 28 2 24 2 18 V 8 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M 14 7 L 18 12 H 10 Z" fill="currentColor" />
      </g>
      <text x="34" y="19" fontFamily="var(--font-outfit), sans-serif" fontWeight="700" fontSize="13" letterSpacing="0.02em">
        Queensland Government
      </text>
      <text x="34" y="32" fontFamily="var(--font-outfit), sans-serif" fontWeight="500" fontSize="11" opacity="0.8">
        Office of Fair Trading
      </text>
    </svg>
  );
}

function RTALogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 40"
      fill="currentColor"
      className={className}
      aria-label="RTA Queensland Logo"
    >
      <g transform="translate(2, 8)">
        <path d="M 0 18 Q 12 0 24 18" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M 6 22 Q 12 8 18 22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      </g>
      <text x="32" y="24" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="800" fontSize="20" letterSpacing="0.08em">
        RTA
      </text>
      <text x="82" y="24" fontFamily="var(--font-outfit), sans-serif" fontWeight="500" fontSize="12" opacity="0.8">
        QUEENSLAND
      </text>
    </svg>
  );
}

function TICALogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 150 40"
      fill="currentColor"
      className={className}
      aria-label="TICA Logo"
    >
      <g transform="translate(2, 6)">
        <path d="M 13 2 L 24 6 V 16 C 24 22 13 26 13 26 C 13 26 2 22 2 16 V 6 Z" fill="currentColor" />
        <path d="M 8 12 L 12 16 L 18 10" fill="none" className="stroke-white dark:stroke-[#090909]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="32" y="27" fontFamily="var(--font-space-grotesk), sans-serif" fontWeight="800" fontSize="22" letterSpacing="0.08em">
        TICA
      </text>
    </svg>
  );
}

export function TrustBar() {
  const integrations = [
    { name: "REA Group", logo: REAGroupLogo },
    { name: "realestate.com.au", logo: RealestateLogo },
    { name: "Domain", logo: DomainLogo },
    { name: "Australian Taxation Office", logo: ATOLogo },
    { name: "Queensland Fair Trading", logo: FairTradingLogo },
    { name: "RTA Queensland", logo: RTALogo },
    { name: "TICA Database", logo: TICALogo },
  ];

  // Tripled list for a 100% smooth, seamless infinite loop
  const marqueeList = [...integrations, ...integrations, ...integrations];

  return (
    <section className="py-12 md:py-16 relative overflow-hidden bg-background text-foreground border-y border-border/40 transition-colors duration-300">
      {/* Background Layer 1: Ambient Radial Glow matching Hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[220px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      {/* Background Layer 2: Architectural Grid Linework matching Hero */}
      <div className="absolute inset-0 bg-architectural-grid opacity-40 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 relative z-10 space-y-6">
        {/* Section Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          {/* Eyebrow Heading */}
          <Reveal direction="up" delay={0.1}>
            <p className="text-[11px] font-mono font-semibold tracking-[0.25em] uppercase text-muted">
              TRUSTED ACROSS AUSTRALIA&apos;S PROPERTY ECOSYSTEM
            </p>
          </Reveal>

          {/* Main Heading */}
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading tracking-tight text-foreground leading-snug">
              Built Around the Tools the Industry Already Uses
            </h2>
          </Reveal>

          {/* Subtitle */}
          <Reveal direction="up" delay={0.3}>
            <p className="text-xs sm:text-sm text-muted max-w-[580px] mx-auto leading-relaxed">
              Seamlessly integrated with Australia&apos;s leading property platforms, government agencies and compliance services.
            </p>
          </Reveal>
        </div>

        {/* Infinite Scrolling Horizontal Marquee */}
        <div className="relative w-full overflow-hidden mask-edge-fade group py-3">
          <div className="animate-marquee flex items-center">
            {marqueeList.map((item, idx) => {
              const LogoComponent = item.logo;
              return (
                <div key={idx} className="flex items-center shrink-0">
                  {/* Logo item wrapper */}
                  <div
                    className="group/item flex items-center justify-center cursor-pointer select-none px-3"
                    title={`Integrated with ${item.name}`}
                  >
                    <LogoComponent className="h-6 w-auto max-w-[130px] text-slate-900 dark:text-white/75 group-hover/item:text-black dark:group-hover/item:text-white transition-all duration-300" />
                  </div>

                  {/* Gold Separator Dot */}
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C7A66A]/40 mx-6 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
