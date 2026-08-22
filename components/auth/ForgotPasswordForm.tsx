"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { forgotPasswordAction } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPasswordAction(email);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage("Unable to send reset instructions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-300 text-left">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[#11181C] dark:text-[#F4F3EF]">
            Check your inbox
          </h2>
          <p className="text-sm text-[#697277] dark:text-[#A8B0B3] leading-relaxed">
            If an account exists for{" "}
            <span className="text-[#11181C] dark:text-white font-semibold">{email}</span>, we&apos;ve sent secure instructions to reset your password.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#152228] border border-black/10 dark:border-[#26373F] text-xs text-[#697277] dark:text-[#A8B0B3] space-y-2 shadow-sm">
          <p className="font-semibold text-[#11181C] dark:text-white">Next steps:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click the link inside the email to choose a new password.</li>
            <li>If you don&apos;t see the email in 2 minutes, check your spam or junk folder.</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href={`/reset-password?email=${encodeURIComponent(email)}`}
            className="w-full h-12 bg-[#11181C] dark:bg-[#C7A66A] text-white dark:text-[#081216] font-semibold text-sm rounded-xl hover:bg-[#1A262B] dark:hover:bg-[#d8b77b] transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span>Enter New Password</span>
            <ArrowRight className="w-4 h-4 text-[#C7A66A] dark:text-[#081216]" />
          </Link>

          <Link
            href="/login"
            className="w-full h-12 bg-white dark:bg-[#152228] border border-black/10 dark:border-[#26373F] text-[#11181C] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#EFE2C9]/60 dark:bg-[#C7A66A]/20 border border-[#C7A66A]/30 text-[11px] font-mono tracking-widest text-[#C7A66A] font-bold uppercase">
          RESET PASSWORD
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#11181C] dark:text-[#F4F3EF]">
          Reset your password
        </h2>
        <p className="text-sm text-[#697277] dark:text-[#A8B0B3]">
          Enter your email and we&apos;ll send you a secure password reset link.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs transition-all duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span className="leading-relaxed font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="forgot-email"
            className="block text-xs font-semibold text-[#11181C] dark:text-[#F4F3EF] tracking-wide"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com.au"
              className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-white dark:bg-[#152228] border border-[#11181C]/15 dark:border-[#26373F] text-sm text-[#11181C] dark:text-white placeholder:text-[#697277]/60 dark:placeholder:text-[#A8B0B3]/50 focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all duration-150 shadow-sm"
            />
            <Mail className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-[#11181C] dark:bg-[#C7A66A] text-white dark:text-[#081216] font-semibold text-base rounded-xl hover:bg-[#1A262B] dark:hover:bg-[#d8b77b] hover:shadow-lg active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#C7A66A] dark:text-[#081216]" />
                <span>Sending reset link...</span>
              </>
            ) : (
              <>
                <span>Send reset link</span>
                <ArrowRight className="w-5 h-5 text-[#C7A66A] dark:text-[#081216] transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Back to Login link */}
      <div className="pt-2 text-center text-xs text-[#697277] dark:text-[#A8B0B3] border-t border-black/10 dark:border-white/10">
        <Link
          href="/login"
          className="text-[#11181C] dark:text-white font-semibold hover:text-[#C7A66A] transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C7A66A]" /> Back to login
        </Link>
      </div>
    </div>
  );
}
