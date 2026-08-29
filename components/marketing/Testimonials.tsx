"use client";

import React from "react";
import { Star, Quotes as Quote } from "@phosphor-icons/react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function Testimonials() {
  const supportingReviews = [
    {
      quote: "Great platform! Everything we need in one place.",
      author: "Emily R.",
      location: "Brisbane",
    },
    {
      quote: "Saves us so much time every single week.",
      author: "Mark T.",
      location: "Sydney",
    },
    {
      quote: "Reporting is incredible. Tax time is stress free.",
      author: "Daniel L.",
      location: "Perth",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel>TRUSTED BY PROPERTY PROFESSIONALS</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-foreground uppercase">
              Proven in the Australian Market
            </h2>
          </Reveal>
        </div>

        {/* Featured Large Testimonial Card */}
        <Reveal direction="up" delay={0.2} duration={0.8}>
          <div className="p-8 sm:p-12 rounded-2xl border border-border bg-surface shadow-subtle-card relative overflow-hidden max-w-4xl mx-auto">
            <Quote className="w-12 h-12 text-accent/20 absolute top-6 right-6" />
            <div className="space-y-6 relative z-10">
              <div className="flex text-amber-500 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <blockquote className="text-lg sm:text-2xl font-normal font-sans text-foreground leading-relaxed">
                “PropertyLedge has taken hours of administration out of our week.
                Our portfolio is easier to manage, our reporting is cleaner, and our
                tenants get faster responses.”
              </blockquote>
              <div className="pt-2 border-t border-border/50">
                <div className="font-heading font-bold text-foreground text-sm">
                  James Mitchell
                </div>
                <div className="text-xs text-muted">Property Manager, Melbourne</div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 3 Smaller Supporting Testimonial Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {supportingReviews.map((rev, idx) => (
            <StaggerItem key={idx}>
              <div className="p-6 rounded-2xl border border-border bg-surface-subtle/40 hover:border-accent/40 transition-colors h-full flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex text-amber-500 gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                    “{rev.quote}”
                  </p>
                </div>
                <div className="text-xs border-t border-border/40 pt-3">
                  <span className="font-bold text-foreground">{rev.author}</span>
                  <span className="text-muted">, {rev.location}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
