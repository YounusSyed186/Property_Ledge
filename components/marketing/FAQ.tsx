"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is PropertyLedge built for Australian landlords?",
      answer:
        "Yes, 100%. PropertyLedge was engineered specifically around Australian tenancy legislation across all states (NSW Fair Trading, VCAT Victoria, RTA Queensland, WA DMIRS, etc.) and is configured for Australian tax structures and ATO expense categorisation.",
    },
    {
      question: "How does rent collection work?",
      answer:
        "PropertyLedge automates tenant invoicing, sends timely reminders via SMS/email, and generates Australian BPAY / Direct Debit / PayID payment options. Incoming payments reconcile automatically against the property ledger.",
    },
    {
      question: "Can I manage multiple properties and entities?",
      answer:
        "Yes. Whether you have 2 properties in your personal name, a commercial warehouse in a company trust, or a 50-property portfolio across an agency, you can manage distinct entities, bank accounts, and ownership structures in one unified dashboard.",
    },
    {
      question: "Are digital leases legally binding in Australia?",
      answer:
        "Yes. All digital tenancy agreements created and signed in PropertyLedge comply with the Australian Electronic Transactions Act 1999 and state-specific residential tenancy legislation. Every executed lease contains an immutable digital audit trail with cryptographic timestamps.",
    },
    {
      question: "Can my team or external accountant access the portfolio?",
      answer:
        "Yes. You can invite team members, property managers, co-owners, and accountants with granular role-based permissions (e.g. read-only financial access for your accountant during tax season).",
    },
    {
      question: "What happens to my existing tenancy and property data?",
      answer:
        "You can import your entire existing property roster, tenant details, historical ledgers, and lease agreements via our 1-click CSV importer or direct PMS migration tools in just minutes.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 space-y-12">
        <div className="text-center space-y-4">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel>FREQUENTLY ASKED QUESTIONS</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-foreground uppercase">
              Everything You Need to Know
            </h2>
          </Reveal>
        </div>

        {/* Accordion list */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Reveal key={idx} direction="up" delay={0.05 * idx}>
                <div
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "border-accent/50 bg-surface shadow-xs"
                      : "border-border bg-surface/50 hover:border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-heading font-semibold text-sm sm:text-base text-foreground select-none"
                  >
                    <span>{faq.question}</span>
                    <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-accent shrink-0 transition-transform duration-300">
                      {isOpen ? (
                        <Minus className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/40 pt-3 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
