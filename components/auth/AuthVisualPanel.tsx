"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart3,
  Smartphone,
  TrendingUp,
  Lock,
} from "lucide-react";

interface AuthVisualPanelProps {
  mode: "signup" | "login" | "forgot-password" | "reset-password" | "verify-email";
  compact?: boolean;
}

export function AuthVisualPanel({ compact = false }: AuthVisualPanelProps) {
  if (compact) {
    return (
      <div className="bg-[#081216] border border-[#1A262B] rounded-2xl p-5 text-[#F4F3EF] relative overflow-hidden shadow-lg">
        {/* Architectural Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-right-bottom opacity-25 pointer-events-none mix-blend-luminosity"
          style={{ backgroundImage: "url('/images/loginBG.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081216] via-[#081216]/90 to-transparent pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center">
                <img
                  src="/logo_Dark.png"
                  alt="PropertyLedge Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#C7A66A] font-semibold">
                PROPERTYLEDGE
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-[#F4F3EF]">
              Own more. <span className="text-[#C7A66A]">Manage less.</span>
            </h2>
            <p className="text-xs text-[#A8B0B3] mt-0.5 line-clamp-1">
              The all-in-one platform for your properties, tenants, leases, and financials.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#0E1A1F]/90 border border-[#1E2D33] px-3 py-1.5 rounded-xl text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#F4F3EF] font-medium font-mono">12 Properties Live</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[100vh] flex flex-col justify-between p-8 lg:p-12 xl:p-14 bg-[#081216] text-[#F4F3EF] overflow-hidden select-none border-r border-[#172429]">
      {/* Dark Architectural Background Image & Gradient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-right-bottom opacity-30 pointer-events-none mix-blend-luminosity scale-105"
        style={{ backgroundImage: "url('/images/loginBG.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#081216] via-[#081216]/85 to-[#081216] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#081216] via-[#081216]/60 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[480px] h-[480px] rounded-full bg-[#C7A66A]/10 blur-[120px] pointer-events-none" />

      {/* TOP: Brand Logo */}
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A66A] rounded-lg"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
            <img
              src="/logo_Dark.png"
              alt="PropertyLedge Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-heading font-bold text-lg tracking-wider text-[#F4F3EF] uppercase">
            PROPERTYLEDGE
          </span>
        </Link>
      </div>

      {/* MIDDLE: Hero Copy & Product Preview */}
      <div className="relative z-10 my-auto py-8 space-y-8 max-w-[540px]">
        {/* Headline */}
        <div className="space-y-3">
          <h1
            className="font-heading font-extrabold tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(38px, 4vw, 64px)" }}
          >
            <span className="text-[#F4F3EF] block">Own more.</span>
            <span className="text-[#C7A66A] block">Manage less.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#A8B0B3] leading-relaxed max-w-[460px] font-normal">
            The all-in-one platform to manage your properties, tenants, leases, inspections, and financials — effortlessly.
          </p>
        </div>

        {/* Product Preview Card */}
        <div className="bg-[#0E1A1F]/85 backdrop-blur-xl border border-[#1E2E35] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 hover:border-[#C7A66A]/30 transition-colors duration-300">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1E2E35]">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#C7A66A]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#A8B0B3] font-semibold">
                PORTFOLIO OVERVIEW
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          {/* 3 Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#081216]/80 p-3 rounded-xl border border-[#17252A]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#7C878B]">
                PROPERTIES
              </div>
              <div className="font-heading text-xl font-bold text-[#F4F3EF] mt-0.5">12</div>
              <div className="text-[10px] text-[#A8B0B3] mt-0.5">Total</div>
            </div>

            <div className="bg-[#081216]/80 p-3 rounded-xl border border-[#17252A]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#7C878B]">
                MONTHLY RENT
              </div>
              <div className="font-heading text-xl font-bold text-[#F4F3EF] mt-0.5">
                $48,240
              </div>
              <div className="text-[10px] text-[#A8B0B3] mt-0.5">Collected</div>
            </div>

            <div className="bg-[#081216]/80 p-3 rounded-xl border border-[#17252A]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#7C878B]">
                OCCUPANCY
              </div>
              <div className="font-heading text-xl font-bold text-[#C7A66A] mt-0.5">
                96.4%
              </div>
              <div className="text-[10px] text-[#A8B0B3] mt-0.5">Rate</div>
            </div>
          </div>

          {/* 3 Property Rows */}
          <div className="space-y-2 pt-1 font-sans">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#081216]/70 border border-[#17252A] text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[#F4F3EF] font-medium">24 Smith Street</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#A8B0B3] font-mono text-[11px]">$1,150 / wk</span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  OCCUPIED
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#081216]/70 border border-[#17252A] text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[#F4F3EF] font-medium">18 King Street</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#A8B0B3] font-mono text-[11px]">$980 / wk</span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  OCCUPIED
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#081216]/70 border border-[#17252A] text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[#F4F3EF] font-medium">72 George Street</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#A8B0B3] font-mono text-[11px]">$1,450 / wk</span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                  VACANT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Strip */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#C7A66A]">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-[#F4F3EF]">Secure &amp; Reliable</span>
            </div>
            <p className="text-[11px] text-[#A8B0B3] leading-relaxed">
              Bank-level encryption keeps your data safe.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#C7A66A]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-[#F4F3EF]">Real-time Insights</span>
            </div>
            <p className="text-[11px] text-[#A8B0B3] leading-relaxed">
              Track performance and make smarter decisions.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#C7A66A]">
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-[#F4F3EF]">Access Anywhere</span>
            </div>
            <p className="text-[11px] text-[#A8B0B3] leading-relaxed">
              Manage your portfolio from any device.
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM: Testimonial Card */}
      <div className="relative z-10 pt-4">
        <div className="bg-[#0E1A1F]/70 border border-[#1E2E35] rounded-2xl p-4 sm:p-5 backdrop-blur-md">
          <p className="text-xs sm:text-sm text-[#F4F3EF]/90 italic leading-relaxed">
            &ldquo;PropertyLedge has transformed the way we manage our properties. Everything in one place, real-time insights, and zero hassle.&rdquo;
          </p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-medium text-[#C7A66A]">&mdash; Sarah J.</span>
            <span className="text-[#A8B0B3] font-mono text-[11px]">Property Investor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
