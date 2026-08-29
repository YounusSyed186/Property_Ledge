'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import {
  ONBOARDING_ASSETS,
  getNextStepStage,
} from '@/lib/onboarding/visuals';
import type { OnboardingStage } from '@/lib/onboarding/state';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Home,
  CreditCard,
  Key,
} from 'lucide-react';

interface OnboardingStepVisualProps {
  stage: OnboardingStage;
  className?: string;
}

export function OnboardingStepVisual({ stage, className = '' }: OnboardingStepVisualProps) {
  const { isDark } = useAppTheme();
  const [hasError, setHasError] = useState(false);

  const currentAsset = ONBOARDING_ASSETS[stage] || ONBOARDING_ASSETS.workspace;
  const isFirstStep = stage === 'welcome' || stage === 'workspace';

  // Resolve current theme asset
  const activeSrc = isDark ? currentAsset.dark : currentAsset.light;

  // Next step asset for strategic preloading
  const nextStage = getNextStepStage(stage);
  const nextAsset = nextStage ? ONBOARDING_ASSETS[nextStage] : null;
  const nextPreloadSrc = nextAsset ? (isDark ? nextAsset.dark : nextAsset.light) : null;

  const getStepIndex = (st: OnboardingStage) => {
    switch (st) {
      case 'welcome':
      case 'workspace':
        return 0;
      case 'subscription':
        return 1;
      case 'property':
        return 2;
      case 'ready':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(stage);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-surface-subtle/40 dark:bg-[#0E1112] flex flex-col justify-between select-none ${className}`}
    >
      {/* Strategic Head Preload for Next Step Asset */}
      {nextPreloadSrc && (
        <link rel="preload" as="image" href={nextPreloadSrc} key={nextPreloadSrc} />
      )}

      {/* Main Background Visual Image */}
      <AnimatePresence mode="wait">
        {!hasError ? (
          <motion.div
            key={`${stage}-${isDark ? 'dark' : 'light'}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={activeSrc}
              alt={currentAsset.alt}
              fill
              priority={isFirstStep}
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center w-full h-full"
              quality={92}
              onError={() => setHasError(true)}
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-surface-subtle/30 dark:bg-[#121719]" />
        )}
      </AnimatePresence>

      {/* Left Edge Seamless Blend Gradient into Form Side */}
      <div className="absolute inset-y-0 left-0 w-28 sm:w-36 bg-gradient-to-r from-surface dark:from-[#0E1112] via-surface/70 dark:via-[#0E1112]/70 to-transparent z-10 pointer-events-none" />

      {/* Top & Bottom Ambient Gradients for Text Contrast */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 via-black/15 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 via-black/45 to-transparent z-10 pointer-events-none" />

      {/* Top Logo / Brand Watermark */}
      <div className="relative z-20 p-6 sm:p-8 flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 dark:bg-black/60 backdrop-blur-md border border-white/15 text-white shadow-lg">
          <div className="flex h-5 w-5 items-center justify-center rounded-md overflow-hidden bg-white/10 p-0.5 shrink-0">
            <img src="/logo_Dark.png" alt="PropertyLedge" className="h-full w-full object-contain" />
          </div>
          <span className="font-heading text-xs font-bold tracking-tight">
            PropertyLedge<span className="text-[#C7A66A] text-[10px] font-normal">.com.au</span>
          </span>
        </div>
      </div>

      {/* Center Floating Glass Metric Cards Overlay */}
      <div className="relative z-20 px-6 sm:px-8 py-2 flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence mode="wait">
          {(stage === 'welcome' || stage === 'workspace') && (
            <motion.div
              key="cards-workspace"
              initial={{ opacity: 0, x: 20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-2.5 w-full max-w-[210px] sm:max-w-[230px]"
            >
              {/* Card 1: Properties */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-base font-bold text-foreground leading-none">12</span>
                    <p className="text-[11px] text-muted font-medium leading-none mt-0.5">Properties</p>
                  </div>
                </div>
                <div className="flex items-center justify-end text-[10px] text-accent font-semibold pt-1">
                  <span>View all →</span>
                </div>
              </motion.div>

              {/* Card 2: Tenants */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.22 }}
                className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-base font-bold text-foreground leading-none">38</span>
                    <p className="text-[11px] text-muted font-medium leading-none mt-0.5">Tenants</p>
                  </div>
                </div>
                <div className="flex items-center justify-end text-[10px] text-accent font-semibold pt-1">
                  <span>View all →</span>
                </div>
              </motion.div>

              {/* Card 3: Monthly Rent */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.29 }}
                className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-sm">
                    $
                  </div>
                  <div>
                    <span className="font-heading text-base font-bold text-foreground leading-none">$24,850</span>
                    <p className="text-[11px] text-muted font-medium leading-none mt-0.5">Monthly rent</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-border/40">
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-2.5 w-2.5" /> +12%
                  </span>
                  <span>vs last month</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {stage === 'subscription' && (
            <motion.div
              key="cards-subscription"
              initial={{ opacity: 0, x: 20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-2.5 w-full max-w-[210px] sm:max-w-[230px]"
            >
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#C7A66A]/20 text-[#C7A66A] flex items-center justify-center shrink-0 font-bold">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-sm font-bold text-foreground">Pro Portfolio</span>
                    <p className="text-[10px] text-muted">14-Day Free Trial</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted pt-1.5 border-t border-border/40">
                  <span className="text-foreground font-bold">$49/mo</span>
                  <span className="text-emerald-500 font-semibold">Active</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 font-bold">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-xs font-bold text-foreground">Automated Invoicing</span>
                    <p className="text-[10px] text-muted">Direct Debit & Stripe</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'property' && (
            <motion.div
              key="cards-property"
              initial={{ opacity: 0, x: 20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-2.5 w-full max-w-[210px] sm:max-w-[230px]"
            >
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-xs font-bold text-foreground truncate block">Sunset Heights</span>
                    <p className="text-[10px] text-muted">Residential · Active Lease</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/40">
                  <span className="text-muted">Status</span>
                  <span className="text-emerald-500 font-bold">Occupied</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <Key className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-xs font-bold text-foreground">Lease Agreements</span>
                    <p className="text-[10px] text-muted">Digital Signing Ready</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'ready' && (
            <motion.div
              key="cards-ready"
              initial={{ opacity: 0, x: 20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-2.5 w-full max-w-[210px] sm:max-w-[230px]"
            >
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-xs font-bold text-foreground">Portfolio Configured</span>
                    <p className="text-[10px] text-emerald-500 font-semibold">100% Ready</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121719]/90 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/15 text-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#C7A66A]/20 text-[#C7A66A] flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-heading text-xs font-bold text-foreground">Bank Grade Security</span>
                    <p className="text-[10px] text-muted">256-bit Encrypted</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Contextual Narrative & Pagination Indicator */}
      <div className="relative z-20 p-6 sm:p-8 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-1 text-white"
          >
            <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md">
              {stage === 'welcome' || stage === 'workspace'
                ? 'Your property portfolio, organized.'
                : stage === 'subscription'
                ? 'Choose the path that fits your goals.'
                : stage === 'property'
                ? 'Your properties, all in one place.'
                : "You're ready to get started."}
            </h3>
            <p className="text-xs text-white/80 font-normal max-w-sm drop-shadow-sm leading-relaxed">
              {stage === 'welcome' || stage === 'workspace'
                ? 'Everything starts with your workspace.'
                : stage === 'subscription'
                ? 'Select a plan that scales seamlessly with your portfolio.'
                : stage === 'property'
                ? 'Map your properties, tenants, and leases in one central hub.'
                : 'Your PropertyLedge workspace is configured and ready for launch.'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step pagination indicator dots */}
        <div className="flex items-center gap-1.5 pt-1">
          {[0, 1, 2, 3].map((stepIdx) => {
            const isActive = stepIdx === currentStepIdx;
            return (
              <span
                key={stepIdx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive ? 'w-5 bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'w-1.5 bg-white/40'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
