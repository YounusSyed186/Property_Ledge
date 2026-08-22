"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";

interface EmailVerificationViewProps {
  targetEmail?: string;
}

export function EmailVerificationView({ targetEmail }: EmailVerificationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = targetEmail || searchParams?.get("email") || "sarah.williams@propertyledge.com.au";

  const [cooldown, setCooldown] = useState(42);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess(false);

    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsResending(false);
    setResendSuccess(true);
    setCooldown(45);
  };

  const handleSimulateVerification = async () => {
    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    router.push("/dashboard");
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 text-left">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-[#EFE2C9]/60 dark:bg-[#C7A66A]/20 border border-[#C7A66A]/30 text-[#C7A66A] flex items-center justify-center shadow-sm">
        <Mail className="w-7 h-7" />
      </div>

      {/* Heading & Target Email Container */}
      <div className="space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#EFE2C9]/60 dark:bg-[#C7A66A]/20 border border-[#C7A66A]/30 text-[11px] font-mono tracking-widest text-[#C7A66A] font-bold uppercase">
          VERIFICATION SENT
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#11181C] dark:text-[#F4F3EF]">
          Check your email
        </h2>
        <p className="text-sm text-[#697277] dark:text-[#A8B0B3] leading-relaxed">
          We&apos;ve sent a secure verification link to your email address:
        </p>

        {/* User Email Highlight Container */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#152228] border border-black/10 dark:border-[#26373F] text-sm font-semibold text-[#11181C] dark:text-white font-mono shadow-sm inline-block">
          {email}
        </div>
      </div>

      <p className="text-xs text-[#697277] dark:text-[#A8B0B3] leading-relaxed">
        Please open your inbox and click the verification link to confirm your email address and activate your PropertyLedge workspace.
      </p>

      {/* Instant Verification Button */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleSimulateVerification}
          disabled={isVerifying}
          className="w-full h-14 bg-[#11181C] dark:bg-[#C7A66A] text-white dark:text-[#081216] font-semibold text-base rounded-xl hover:bg-[#1A262B] dark:hover:bg-[#d8b77b] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md disabled:opacity-60"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#C7A66A] dark:text-[#081216]" />
              <span>Verifying account...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#C7A66A] dark:text-[#081216]" />
              <span>I&apos;ve verified my email &rarr;</span>
            </>
          )}
        </button>

        {/* Resend Action with Cooldown Timer */}
        <div className="text-xs text-[#697277] dark:text-[#A8B0B3] pt-1">
          {resendSuccess && (
            <div className="mb-2 text-xs text-emerald-600 font-semibold">
              ✓ Verification email has been resent to your inbox.
            </div>
          )}

          <div>
            Didn&apos;t receive the email?{" "}
            {cooldown > 0 ? (
              <span className="text-[#11181C] dark:text-white font-mono font-medium ml-1">
                Resend available in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#C7A66A] font-bold hover:underline transition-colors ml-1 inline-flex items-center gap-1 disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend verification email"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alternative actions */}
      <div className="pt-3 flex items-center justify-between text-xs text-[#697277] dark:text-[#A8B0B3] border-t border-black/10 dark:border-white/10">
        <Link
          href="/signup"
          className="hover:text-[#11181C] dark:hover:text-white transition-colors inline-flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C7A66A]" /> Change email
        </Link>
        <Link
          href="/login"
          className="hover:text-[#11181C] dark:hover:text-white transition-colors font-medium"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
