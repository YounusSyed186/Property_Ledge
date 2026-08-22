import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { OwnerHero } from "@/components/marketing/owners/OwnerHero";
import { OwnerProblemSection } from "@/components/marketing/owners/OwnerProblemSection";
import { OwnerPortfolioSection } from "@/components/marketing/owners/OwnerPortfolioSection";
import { OwnerRentSection } from "@/components/marketing/owners/OwnerRentSection";
import { OwnerLeaseSection } from "@/components/marketing/owners/OwnerLeaseSection";
import { OwnerTenantSection } from "@/components/marketing/owners/OwnerTenantSection";
import { OwnerInspectionSection } from "@/components/marketing/owners/OwnerInspectionSection";
import { OwnerFinancialSection } from "@/components/marketing/owners/OwnerFinancialSection";
import { OwnerTimeline } from "@/components/marketing/owners/OwnerTimeline";
import { OwnerConnectedProperty } from "@/components/marketing/owners/OwnerConnectedProperty";
import { OwnerWorkflow } from "@/components/marketing/owners/OwnerWorkflow";
import { OwnerPortfolioScale } from "@/components/marketing/owners/OwnerPortfolioScale";
import { OwnerSecuritySection } from "@/components/marketing/owners/OwnerSecuritySection";
import { OwnerFinalCTA } from "@/components/marketing/owners/OwnerFinalCTA";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Property Management for Owners | PropertyLedge",
  description:
    "Manage your property portfolio, rent, leases, inspections and financial records in one place with PropertyLedge.",
};

export default function OwnersSolutionsPage() {
  return (
    <main className="min-h-screen bg-background dark:bg-[#0E1112] text-foreground flex flex-col antialiased">
      <Navbar />
      <OwnerHero />
      <OwnerProblemSection />
      
      {/* Editorial Content Flow */}
      <div className="space-y-4 md:space-y-8">
        <OwnerPortfolioSection />
        <OwnerRentSection />
        <OwnerLeaseSection />
        <OwnerTenantSection />
        <OwnerInspectionSection />
        <OwnerFinancialSection />
        <OwnerTimeline />
        <OwnerConnectedProperty />
        <OwnerWorkflow />
        <OwnerPortfolioScale />
        <OwnerSecuritySection />
      </div>

      <OwnerFinalCTA />
      <Footer />
    </main>
  );
}
