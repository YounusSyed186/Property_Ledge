"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";
import { signInWithGoogle } from "@/lib/auth/oauth";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const remembered = localStorage.getItem("propertyledge_remember_me");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || "Unable to sign in with Google.");
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during Google sign in.");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem("propertyledge_remember_me", email);
      } else {
        localStorage.removeItem("propertyledge_remember_me");
      }

      const res = await loginAction({ email, password });

      if (!res.success) {
        setErrorMessage(
          res.error || "The email or password you entered is incorrect. Please try again."
        );
        setIsLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      }

      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirectTo") || "/dashboard";

      router.push(redirectTo);
      router.refresh();
    } catch {
      setErrorMessage("A network error occurred while signing you in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#EFE2C9]/60 dark:bg-[#C7A66A]/20 border border-[#C7A66A]/30 text-[11px] font-mono tracking-widest text-[#C7A66A] font-bold uppercase">
          WELCOME BACK
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#11181C] dark:text-[#F4F3EF]">
          Welcome back
        </h2>
        <p className="text-sm text-[#697277] dark:text-[#A8B0B3]">
          Sign in to continue managing your property portfolio.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs transition-all duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="space-y-1 leading-relaxed font-medium">
            <div>{errorMessage}</div>
            <div>
              <Link
                href="/forgot-password"
                className="text-[#11181C] dark:text-white underline font-bold hover:text-[#C7A66A]"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Primary Social Auth (Google OAuth) */}
      <div className="pt-1">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          className="w-full py-3.5 sm:py-4 h-12 sm:h-14 min-h-[52px] px-4 rounded-xl bg-white dark:bg-[#152228] border border-[#11181C]/20 dark:border-[#26373F] hover:border-[#11181C]/40 dark:hover:border-[#C7A66A]/40 text-base font-bold text-[#11181C] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3 shadow-md group disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative py-1 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/10 dark:border-white/10" />
        </div>
        <div className="relative bg-[#F7F6F2] dark:bg-[#0E171B] px-4 text-xs text-[#697277] dark:text-[#A8B0B3] font-medium">
          or sign in with email
        </div>
      </div>

      {/* Form (Email & Password) */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-[#11181C] dark:text-[#F4F3EF] tracking-wide"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah.williams@propertyledge.com.au"
              className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-white dark:bg-[#152228] border border-[#11181C]/15 dark:border-[#26373F] text-sm text-[#11181C] dark:text-white placeholder:text-[#697277]/60 dark:placeholder:text-[#A8B0B3]/50 focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all duration-150 shadow-sm"
            />
            <Mail className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[#11181C] dark:text-[#F4F3EF] tracking-wide"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#697277] dark:text-[#A8B0B3] hover:text-[#C7A66A] font-semibold transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-12 pl-10 pr-10 rounded-xl bg-white dark:bg-[#152228] border border-[#11181C]/15 dark:border-[#26373F] text-sm text-[#11181C] dark:text-white placeholder:text-[#697277]/60 dark:placeholder:text-[#A8B0B3]/50 focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all duration-150 shadow-sm"
            />
            <Lock className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#697277] dark:text-[#A8B0B3] hover:text-[#11181C] dark:hover:text-white transition-colors p-1 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C7A66A]"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
              ) : (
                <Eye className="w-4 h-4 text-[#697277] dark:text-[#A8B0B3]" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#11181C]/20 text-[#11181C] accent-[#11181C] focus:ring-[#C7A66A]"
            />
            <span className="text-[#697277] dark:text-[#A8B0B3] group-hover:text-[#11181C] dark:group-hover:text-white transition-colors">
              Remember me
            </span>
          </label>
        </div>

        {/* Submit CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 sm:py-4 h-12 sm:h-14 min-h-[52px] bg-[#11181C] dark:bg-[#C7A66A] text-white dark:text-[#081216] font-bold text-base rounded-xl hover:bg-[#1A262B] dark:hover:bg-[#d8b77b] hover:shadow-xl active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#C7A66A] dark:text-[#081216]" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Log In with Email</span>
                <ArrowRight className="w-4 h-4 text-[#C7A66A] dark:text-[#081216] transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Switch to Signup */}
      <div className="pt-2 text-center text-xs text-[#697277] dark:text-[#A8B0B3] border-t border-black/10 dark:border-white/10">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[#C7A66A] font-bold hover:underline transition-colors ml-1 inline-flex items-center gap-1"
        >
          Create one &rarr;
        </Link>
      </div>
    </div>
  );
}
