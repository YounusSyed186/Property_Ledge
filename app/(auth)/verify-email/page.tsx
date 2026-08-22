import React, { Suspense } from "react";
import { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmailVerificationView } from "@/components/auth/EmailVerificationView";

export const metadata: Metadata = {
  title: "Verify Email | PropertyLedge",
  description: "Confirm your email address to activate your PropertyLedge workspace.",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell mode="verify-email">
      <Suspense fallback={<div className="p-4 text-center text-xs text-[#697277]">Loading verification...</div>}>
        <EmailVerificationView />
      </Suspense>
    </AuthShell>
  );
}
