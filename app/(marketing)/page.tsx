import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import { TrustBar } from "@/components/marketing/TrustBar";
import { PortfolioSection } from "@/components/marketing/PortfolioSection";
import { RentCollectionSection } from "@/components/marketing/RentCollectionSection";
import { FinancialSection } from "@/components/marketing/FinancialSection";
import { InspectionSection } from "@/components/marketing/InspectionSection";
import { LeasingSection } from "@/components/marketing/LeasingSection";
import { AutomationSection } from "@/components/marketing/AutomationSection";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <Hero />
      <TrustBar />
      <PortfolioSection />
      <RentCollectionSection />
      <FinancialSection />
      <InspectionSection />
      <LeasingSection />
      <AutomationSection />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
