import React, { Suspense } from "react";
import { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | PropertyLedge",
  description: "Set a new password for your PropertyLedge account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell mode="reset-password">
      <Suspense fallback={<div className="p-4 text-center text-xs text-[#697277]">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
