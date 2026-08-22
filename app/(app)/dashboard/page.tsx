import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getAccountContext } from "@/lib/auth/queries";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/profile/ProfileCard";

export const metadata: Metadata = {
  title: "Dashboard Account Management | PropertyLedge",
  description: "View and manage your PropertyLedge user profile, identity, and account context.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  const accountContext = await getAccountContext(user.id);

  const userPayload = {
    id: user.id,
    email: user.email || "user@propertyledge.com.au",
    fullName: (profile as any)?.full_name || user.user_metadata?.full_name || "Henry Sullivan",
    phone: (profile as any)?.phone || "",
    avatarUrl: (profile as any)?.avatar_url || user.user_metadata?.avatar_url || "",
    createdAt: (profile as any)?.created_at || user.created_at,
    emailVerified: Boolean(user.email_confirmed_at),
    provider: user.app_metadata?.provider || "email",
  };

  const accountContextPayload = accountContext
    ? {
        status: (accountContext as any).status,
        onboardingStatus: (accountContext as any).onboarding_status,
        firstLoginAt: (accountContext as any).first_login_at,
        lastLoginAt: (accountContext as any).last_login_at,
        createdAt: (accountContext as any).created_at,
        updatedAt: (accountContext as any).updated_at,
      }
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <Navbar />

      <div className="flex-1 pt-24 pb-16 px-4 sm:px-8 lg:px-12 max-w-[1440px] mx-auto w-full flex flex-col justify-start">
        <ProfileCard user={userPayload} accountContext={accountContextPayload} />
      </div>

      <Footer />
    </main>
  );
}
