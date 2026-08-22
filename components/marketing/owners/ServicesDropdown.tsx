"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  DollarSign, 
  FileText, 
  ClipboardCheck, 
  BarChart3, 
  Shield, 
  ArrowRight,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2
} from "lucide-react";
import { services, exploreItems } from "@/lib/owners/owner-data";

interface ServicesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServicesDropdown({ isOpen, onClose }: ServicesDropdownProps) {
  // Local state to track which service item is hovered for the dynamic preview
  const [hoveredService, setHoveredService] = useState<string>("For Property Owners");

  if (!isOpen) return null;

  const getIcon = (title: string) => {
    switch (title) {
      case "For Property Owners":
        return Sparkles;
      case "Property Portfolio":
        return Building2;
      case "Rent & Payments":
        return DollarSign;
      case "Leases":
        return FileText;
      case "Inspections":
        return ClipboardCheck;
      case "Financial Reporting":
        return BarChart3;
      default:
        return Layers;
    }
  };

  const getExploreIcon = (title: string) => {
    switch (title) {
      case "Security":
        return Shield;
      case "Resources":
        return BookOpen;
      default:
        return Layers;
    }
  };

  // Render dynamic preview graphics in the right column based on hovered service
  const renderPreviewGraphic = () => {
    switch (hoveredService) {
      case "Property Portfolio":
        return (
          <div className="p-3 bg-surface dark:bg-[#151A1C] border border-border/60 dark:border-[#2A3032] rounded-lg space-y-2 mt-2">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted">
              <span>Quick Portfolio</span>
              <span className="text-emerald-500">96.4% OCCUPIED</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-foreground">24 Smith St</span>
                <span className="px-1 py-0.2 text-[8px] bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 font-bold uppercase font-heading">Occupied</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-foreground">72 George St</span>
                <span className="px-1 py-0.2 text-[8px] bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 font-bold uppercase font-heading">Vacant</span>
              </div>
            </div>
          </div>
        );

      case "Rent & Payments":
        return (
          <div className="p-3 bg-surface dark:bg-[#151A1C] border border-border/60 dark:border-[#2A3032] rounded-lg space-y-2 mt-2">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted">
              <span>Rent Collected</span>
              <span className="text-emerald-500">92.9%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-subtle dark:bg-[#1B2224] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92.9%" }} />
            </div>
            <div className="flex justify-between text-[10px] text-foreground font-semibold">
              <span>Collected: $44,820</span>
              <span className="text-accent">Due: $3,420</span>
            </div>
          </div>
        );

      case "Leases":
        return (
          <div className="p-3 bg-surface dark:bg-[#151A1C] border border-border/60 dark:border-[#2A3032] rounded-lg space-y-2 mt-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1">
              Active Agreement
            </div>
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between text-foreground">
                <span className="font-semibold">Sarah Williams</span>
                <span className="text-muted">12 Feb 26 — 11 Feb 27</span>
              </div>
              <p className="text-[9px] text-muted">Term: 12 months • Rent auto index sync enabled</p>
            </div>
          </div>
        );

      case "Inspections":
        return (
          <div className="p-3 bg-surface dark:bg-[#151A1C] border border-border/60 dark:border-[#2A3032] rounded-lg space-y-2 mt-2">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted">
              <span>Last Walkthrough</span>
              <span className="text-emerald-500">APPROVED</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Kitchen: All items compliant (24 photos attached)</span>
            </div>
          </div>
        );

      case "Financial Reporting":
        return (
          <div className="p-3 bg-surface dark:bg-[#151A1C] border border-border/60 dark:border-[#2A3032] rounded-lg space-y-2 mt-2">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted">
              <span>Net Yield Yield</span>
              <span className="text-accent font-semibold">+83%</span>
            </div>
            <div className="text-[10px] flex justify-between">
              <span className="text-muted">Gross Income: $58.4k</span>
              <span className="text-muted">Expenses: $9.8k</span>
            </div>
          </div>
        );

      case "For Property Owners":
      default:
        return (
          <div className="p-3 bg-accent/5 dark:bg-[#1B2224]/5 border border-accent/20 dark:border-[#2A3032] rounded-lg mt-2 text-[10px] text-muted space-y-1.5">
            <div className="font-bold text-foreground text-accent">Owner Centralized Hub</div>
            <p className="leading-relaxed">One place to run, understand, and grow your residential property portfolio.</p>
          </div>
        );
    }
  };

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[720px] bg-surface dark:bg-[#151A1C] border border-border dark:border-[#2A3032] rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ease-out"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="services-menu-button"
    >
      <div className="grid grid-cols-12">
        {/* Left Column: Services list with hover listeners to trigger dynamic preview */}
        <div className="col-span-7 p-6 bg-surface dark:bg-[#151A1C] border-r border-border/40 dark:border-[#2A3032]/40">
          <div className="text-[10px] font-heading font-bold uppercase tracking-widest text-accent mb-4">
            Services
          </div>
          <div className="space-y-3.5">
            {services.map((item) => {
              const Icon = getIcon(item.title);
              const isOwnerHome = item.title === "For Property Owners";
              const isHovered = hoveredService === item.title;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  onMouseEnter={() => setHoveredService(item.title)}
                  className={`flex gap-3 p-2 rounded-lg transition-all duration-150 border ${
                    isHovered
                      ? "bg-surface-subtle dark:bg-[#1B2224] border-accent/30 dark:border-[#2A3032]"
                      : isOwnerHome 
                        ? "bg-accent/5 border-accent/15 dark:border-[#2A3032]/40 hover:bg-accent/10" 
                        : "hover:bg-surface-subtle dark:hover:bg-[#1B2224] border-transparent"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${isOwnerHome ? "bg-accent text-white" : "bg-surface-subtle dark:bg-[#1B2224] text-accent"} flex items-center justify-center h-8 w-8 shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {item.title}
                      {isOwnerHome && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-accent/20 text-accent font-heading font-medium rounded-full uppercase tracking-wider">
                          Owner Focus
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted dark:text-[#AEB6B8] mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Column: Explore list & Dynamic Preview Graphic */}
        <div className="col-span-5 p-6 bg-surface-subtle/30 dark:bg-[#1B2224]/30 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <div className="text-[10px] font-heading font-bold uppercase tracking-widest text-accent mb-3">
                Live Preview
              </div>
              
              {/* Dynamic visual preview based on hovered left column option */}
              {renderPreviewGraphic()}
            </div>

            <div className="pt-2">
              <div className="text-[10px] font-heading font-bold uppercase tracking-widest text-accent mb-3">
                Explore
              </div>
              <div className="space-y-3">
                {exploreItems.map((item) => {
                  const Icon = getExploreIcon(item.title);
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={onClose}
                      className="group flex gap-2 items-start text-xs font-semibold text-foreground hover:text-accent transition-colors duration-150"
                    >
                      <Icon className="w-3.5 h-3.5 text-accent/80 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1">
                          <span>{item.title}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 dark:border-[#2A3032]/40 mt-4">
            <Link
              href="/solutions/owners"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-bold font-heading text-accent hover:text-accent-hover transition-colors group"
            >
              <span>Explore all solutions</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
