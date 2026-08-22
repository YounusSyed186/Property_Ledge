"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function Pricing() {
  const plans = [
    {
      id: "landlord",
      name: "Landlord",
      description: "For individual investors",
      price: "$29",
      period: "/ mo",
      features: [
        "Up to 5 properties",
        "Rent collection",
        "Basic reporting",
        "Email support",
      ],
      popular: false,
      cta: "Choose Plan →",
      href: "/checkout?plan=pro",
    },
    {
      id: "manager",
      name: "Property Manager",
      description: "For growing portfolios",
      price: "$79",
      period: "/ mo",
      features: [
        "Up to 50 properties",
        "Advanced reporting",
        "Inspections & leases",
        "Priority support",
      ],
      popular: true,
      cta: "Choose Plan →",
      href: "/checkout?plan=business",
    },
    {
      id: "agency",
      name: "Agency",
      description: "For professional teams",
      price: "Custom",
      period: "",
      features: [
        "Unlimited properties",
        "Team collaboration",
        "Custom integrations",
        "Dedicated support",
      ],
      popular: false,
      cta: "Contact Sales",
      href: "#contact-agency",
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-surface/30 border-y border-border/70 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel>SIMPLE PRICING FOR EVERY PORTFOLIO</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-foreground uppercase">
              Transparent, Scalable Pricing
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.3}>
            <p className="text-base text-muted">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </Reveal>
        </div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, idx) => (
            <StaggerItem key={idx} className="h-full">
              <div
                className={`relative rounded-2xl p-7 sm:p-8 flex flex-col justify-between h-full transition-all duration-300 ${
                  plan.popular
                    ? "bg-surface border-2 border-accent shadow-mockup"
                    : "bg-surface border border-border hover:border-accent/50 shadow-subtle-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white font-heading font-bold text-[10px] tracking-wider uppercase shadow-xs">
                    Most Popular
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-bold font-heading text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted mt-1">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1 pt-2 pb-4 border-b border-border/60">
                    <span className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm font-medium text-muted">
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Included features:
                    </div>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2.5 text-xs text-foreground/85">
                          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={plan.href}
                    className={`w-full py-3 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                      plan.popular
                        ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                        : "bg-surface-subtle border border-border text-foreground hover:border-accent hover:bg-surface-subtle/80"
                    }`}
                  >
                    <span>{plan.cta}</span>
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
