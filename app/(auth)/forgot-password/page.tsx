import { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | PropertyLedge",
  description: "Reset your PropertyLedge account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell mode="forgot-password">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
