"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Globe, ArrowLeft, ChevronDown } from "lucide-react";
import { AuthVisualPanel } from "./AuthVisualPanel";

interface AuthShellProps {
  mode: "signup" | "login" | "forgot-password" | "reset-password" | "verify-email";
  children: React.ReactNode;
}

export function AuthShell({ mode, children }: AuthShellProps) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-[#F7F6F2] dark:bg-[#081216] text-[#11181C] dark:text-[#F4F3EF] flex flex-col lg:flex-row selection:bg-[#C7A66A] selection:text-white">
      {/* LEFT MARKETING & PRODUCT PANEL (Desktop split-screen ~45%) */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[44%] h-full relative shrink-0">
        <AuthVisualPanel mode={mode} />
      </div>

      {/* MOBILE / TABLET COMPACT BRAND HEADER (< 1100px) */}
      <div className="lg:hidden w-full bg-[#081216] p-4 text-white border-b border-[#172429]">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src="/logo_Dark.png"
                alt="PropertyLedge Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-heading font-bold text-sm tracking-wider uppercase text-[#F4F3EF]">
              PROPERTYLEDGE
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-[#A8B0B3] hover:text-[#F4F3EF] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Website
          </Link>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION WORKSPACE (~55%) */}
      <div className="flex-1 min-h-screen lg:min-h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto bg-[#F7F6F2] dark:bg-[#0E171B]">
        {/* Top Controls Row */}
        <div className="w-full max-w-[520px] mx-auto flex items-center justify-between text-xs text-[#697277] dark:text-[#A8B0B3]">
          <Link
            href="/"
            className="hidden lg:inline-flex items-center gap-1.5 font-medium hover:text-[#11181C] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C7A66A]" />
            Back to website
          </Link>

          {/* Language Selector Dropdown */}
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#152228] border border-black/10 dark:border-[#26373F] text-xs font-medium text-[#11181C] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A66A]"
            >
              <Globe className="w-3.5 h-3.5 text-[#697277] dark:text-[#A8B0B3]" />
              <span>English</span>
              <ChevronDown className="w-3 h-3 text-[#697277] dark:text-[#A8B0B3]" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 py-1 bg-white dark:bg-[#152228] border border-black/10 dark:border-[#26373F] rounded-xl shadow-lg z-50 text-xs text-[#11181C] dark:text-white">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 font-medium flex items-center justify-between"
                >
                  <span>English (AU)</span>
                  <span className="text-[#C7A66A]">✓</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 text-[#697277] dark:text-[#A8B0B3]"
                >
                  English (US)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Centered Auth Content Workspace */}
        <div className="w-full max-w-[520px] mx-auto my-auto py-8 sm:py-10">
          {children}
        </div>

        {/* Footer info */}
        <div className="w-full max-w-[520px] mx-auto pt-6 text-center text-xs text-[#697277] dark:text-[#A8B0B3] border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} PropertyLedge Pty Ltd</span>
          <div className="flex items-center gap-3">
            <Link href="/#platform" className="hover:text-[#11181C] dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/#pricing" className="hover:text-[#11181C] dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
