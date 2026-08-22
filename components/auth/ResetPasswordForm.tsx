"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/lib/auth/actions";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPasswordAction(newPassword);

      if (!res.success) {
        setErrorMessage(res.error || "Unable to update password. Please try requesting a new reset link.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setErrorMessage("A network error occurred while updating your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-300 text-left">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[#11181C] dark:text-[#F4F3EF]">
            Password updated
          </h2>
          <p className="text-sm text-[#697277] dark:text-[#A8B0B3] leading-relaxed">
            Your password has been updated successfully. You can now sign in with your new credentials.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full h-14 bg-[#11181C] dark:bg-[#C7A66A] text-white dark:text-[#081216] font-semibold text-base rounded-xl hover:bg-[#1A262B] dark:hover:bg-[#d8b77b] transition-all flex items-center justify-center gap-2 shadow-md group"
          >
            <span>Continue to login</span>
            <ArrowRight className="w-5 h-5 text-[#C7A66A] dark:text-[#081216] transition-transform duration-200 group-hover:translate-x-1" />
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
          NEW PASSWORD
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#11181C] dark:text-[#F4F3EF]">
          Create a new password
        </h2>
        <p className="text-sm text-[#697277] dark:text-[#A8B0B3]">
          Choose a secure, strong password for your PropertyLedge account.
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
        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="block text-xs font-semibold text-[#11181C] dark:text-[#F4F3EF] tracking-wide"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              name="newPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full h-12 pl-10 pr-10 rounded-xl bg-white dark:bg-[#152228] border border-[#11181C]/15 dark:border-[#26373F] text-sm text-[#11181C] dark:text-white placeholder:text-[#697277]/60 dark:placeholder:text-[#A8B0B3]/50 focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all duration-150 shadow-sm"
            />
            <Lock className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#697277] dark:text-[#A8B0B3] hover:text-[#11181C] dark:hover:text-white transition-colors p-1 rounded"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
              ) : (
                <Eye className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
              )}
            </button>
          </div>

          <PasswordStrengthMeter password={newPassword} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-xs font-semibold text-[#11181C] dark:text-[#F4F3EF] tracking-wide"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full h-12 pl-10 pr-10 rounded-xl bg-white dark:bg-[#152228] border border-[#11181C]/15 dark:border-[#26373F] text-sm text-[#11181C] dark:text-white placeholder:text-[#697277]/60 dark:placeholder:text-[#A8B0B3]/50 focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all duration-150 shadow-sm"
            />
            <Lock className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#697277] dark:text-[#A8B0B3] hover:text-[#11181C] dark:hover:text-white transition-colors p-1 rounded"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
              ) : (
                <Eye className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
              )}
            </button>
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
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
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
          className="text-[#11181C] dark:text-white font-semibold hover:text-[#C7A66A] transition-colors inline-flex items-center gap-1"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
