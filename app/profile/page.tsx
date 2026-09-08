import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { container } from "@/composition";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/profile/ProfileCard";

export const metadata: Metadata = {
  title: "Account Management & Profile | PropertyLedge",
  description: "View and manage your PropertyLedge user profile, identity, and account context.",
};

export default async function ProfilePage() {
  const authService = await container.resolve('authService');
  const userRes = await authService.getCurrentUser();
  const user = userRes.success ? userRes.data : null;

  // If unauthenticated, redirect to login
  if (!user) {
    redirect("/login");
  }

  // Fetch profile & account context via application service
  const [profileRes, accountContextRes] = await Promise.all([
    authService.getUserProfile(user.id),
    authService.getAccountContext(user.id),
  ]);
  const profile = profileRes.success ? profileRes.data : null;
  const accountContext = accountContextRes.success ? accountContextRes.data : null;

  const userPayload = {
    id: user.id,
    email: user.email || "user@propertyledge.com.au",
    fullName: profile?.fullName || user.fullName || "Henry Sullivan",
    phone: profile?.phone || user.phone || "",
    avatarUrl: profile?.avatarUrl || user.avatarUrl || "",
    createdAt: profile?.createdAt || user.createdAt,
    emailVerified: Boolean(user.emailVerified),
    provider: user.provider || "email",
    publicId: profile?.publicId || "",
  };

  const accountContextPayload = accountContext
    ? {
        status: accountContext.status,
        onboardingStatus: accountContext.onboardingStatus,
        firstLoginAt: accountContext.firstLoginAt || undefined,
        lastLoginAt: accountContext.lastLoginAt || undefined,
        createdAt: accountContext.createdAt,
        updatedAt: accountContext.updatedAt,
      }
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <Navbar />
      
      {/* Full Screen Width & Height Container */}
      <div className="flex-1 pt-24 pb-16 px-4 sm:px-8 lg:px-12 max-w-[1440px] mx-auto w-full flex flex-col justify-start">
        <ProfileCard user={userPayload} accountContext={accountContextPayload} />
      </div>

      <Footer />
    </main>
  );
}
