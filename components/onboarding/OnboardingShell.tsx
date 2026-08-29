'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ProgressIndicator } from './ProgressIndicator';
import { OnboardingLoadingOverlay } from './OnboardingLoadingOverlay';
import { OnboardingNavProvider, useOnboardingNav } from './OnboardingNavContext';
import { OnboardingStepVisual } from './OnboardingStepVisual';
import { HelpCircle, LogOut, X, Compass } from 'lucide-react';
import {
  getProgressStepFromPath,
  getStageByPath,
  type OnboardingStage,
} from '@/lib/onboarding/state';

interface OnboardingShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  workspaceName?: string;
}

function OnboardingShellInner({ children, userName = 'User', userEmail, workspaceName }: OnboardingShellProps) {
  const pathname = usePathname();
  const { isNavigating } = useOnboardingNav();
  const prefersReducedMotion = useReducedMotion();

  const currentStage: OnboardingStage = getStageByPath(pathname).id;
  const progress = getProgressStepFromPath(pathname);
  const showProgress = currentStage !== 'welcome';

  const xOffset = prefersReducedMotion ? 0 : 16;

  const handleSaveExit = () => {
    window.location.href = '/dashboard';
  };

  const handleExploreWebsite = () => {
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-background text-foreground flex flex-col justify-center items-center relative overflow-hidden font-sans z-50">
      {/* Architectural Background (Landing Page Visual Backdrop) */}
      <div className="absolute top-0 right-0 w-full lg:w-[68%] h-full pointer-events-none z-0 overflow-hidden">
        {/* Dark Mode BG Image */}
        <img
          src="/images/HeroBG_Dark.png"
          alt="Property Architecture"
          className="hidden dark:block w-full h-full object-cover object-right opacity-60 lg:opacity-85 transition-opacity duration-500 scale-105"
        />
        {/* Light Mode BG Image */}
        <img
          src="/images/HeroBG_Light.png"
          alt="Property Architecture"
          className="block dark:hidden w-full h-full object-cover object-right opacity-80 lg:opacity-95 transition-opacity duration-500 scale-105"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 dark:via-background/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90" />
      </div>

      {/* Architectural Grid & Radial Glows */}
      <div className="absolute inset-0 bg-architectural-grid opacity-40 pointer-events-none z-0" />
      <div className="absolute top-1/4 right-10 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Blurred Background Backdrop Overlay */}
      <div className="absolute inset-0 bg-background/60 dark:bg-[#071014]/75 backdrop-blur-xl pointer-events-none z-[5]" />

      {/* Main Container hosting the 90% Screen Height Floating Onboarding Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto h-full max-h-screen">
        <AnimatePresence mode="wait">
          {currentStage === 'welcome' ? (
            /* Single-column Card for Welcome Stage (90vh Height) */
            <motion.div
              key="welcome-card"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[560px] h-[90vh] max-h-[90vh] bg-surface/95 dark:bg-[#0E1112]/95 backdrop-blur-2xl border border-border dark:border-[#2A3032] rounded-3xl shadow-2xl p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Close Button top-right */}
              <button
                onClick={handleExploreWebsite}
                aria-label="Close and explore website"
                title="Explore Website"
                className="absolute top-5 right-5 p-2 rounded-full text-muted hover:text-foreground hover:bg-surface-subtle transition-all cursor-pointer z-20 border border-border/40"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Internal Brand Badge */}
              <div className="flex flex-col items-center text-center space-y-2.5 pt-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-subtle overflow-hidden shadow-sm">
                  <img src="/logo_Light.png" alt="" className="h-7 w-7 object-contain dark:hidden" />
                  <img src="/logo_Dark.png" alt="" className="h-7 w-7 object-contain hidden dark:block" />
                </div>
                <span className="font-heading text-base font-bold tracking-tight text-foreground">
                  PropertyLedge<span className="text-accent text-xs font-normal">.com.au</span>
                </span>
              </div>

              {/* Scrollable Center Content */}
              <div className="relative flex-1 overflow-y-auto custom-scrollbar my-4 py-2 px-1 flex flex-col justify-center">
                {children}
              </div>

              {/* Card Footer info */}
              <div className="pt-4 border-t border-border/40 text-[11px] text-muted flex items-center justify-between shrink-0">
                <button
                  onClick={handleExploreWebsite}
                  className="flex items-center gap-1.5 hover:text-accent font-medium transition-colors cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Explore website first</span>
                </button>
                <button
                  onClick={handleSaveExit}
                  className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Save & exit</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Two-Column Elevated Card for Form Stages (90vh Height) */
            <motion.div
              key="step-card"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-5xl h-[90vh] max-h-[90vh] bg-surface/95 dark:bg-[#0E1112]/95 backdrop-blur-2xl border border-border dark:border-[#2A3032] rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row relative"
            >
              {/* Top-Right Close Button with High Z-Index */}
              <button
                type="button"
                onClick={handleExploreWebsite}
                aria-label="Close and explore website"
                title="Explore Website"
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 dark:bg-black/50 dark:hover:bg-black/70 text-white backdrop-blur-md transition-all cursor-pointer z-50 border border-white/20 shadow-lg hover:scale-105 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Left Side: Onboarding Form & Steps */}
              <div className="flex-1 w-full lg:w-[56%] flex flex-col justify-between p-6 sm:p-8 lg:p-10 overflow-hidden h-full">
                {/* Header Actions inside card */}
                <div className="flex items-center justify-between pb-3 border-b border-border/40 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-subtle overflow-hidden p-1 shadow-sm shrink-0">
                      <img src="/logo_Light.png" alt="PropertyLedge" className="h-full w-full object-contain dark:hidden" />
                      <img src="/logo_Dark.png" alt="PropertyLedge" className="h-full w-full object-contain hidden dark:block" />
                    </div>
                    <span className="font-heading text-xs font-bold text-foreground">
                      PropertyLedge <span className="text-muted font-normal">Onboarding</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted font-medium pr-10">
                    <a
                      href="https://propertyledge.com/support"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Help</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleExploreWebsite}
                      className="flex items-center gap-1 hover:text-accent transition-colors cursor-pointer"
                      title="Explore Website"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Explore</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveExit}
                      className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Save & exit</span>
                    </button>
                  </div>
                </div>

                {showProgress && (
                  <div className="pt-3 pb-2 shrink-0">
                    <ProgressIndicator
                      current={progress.current}
                      total={progress.total}
                      label={progress.label}
                    />
                  </div>
                )}

                {/* Animated Form step with dedicated custom-scrollbar scroll area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2 pr-2 my-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pathname}
                      initial={{ opacity: 0, x: xOffset }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -xOffset }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full"
                    >
                      {children}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Sub card SSL Notice & explore link */}
                <div className="pt-3 border-t border-border/30 text-[10px] text-muted flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={handleExploreWebsite}
                    className="flex items-center gap-1 hover:text-accent font-medium transition-colors cursor-pointer"
                  >
                    <Compass className="h-3 w-3" />
                    <span>Explore website first</span>
                  </button>
                  <span>🔒 SSL Encrypted</span>
                </div>
              </div>

              {/* Right Side: Theme-Aware Contextual Visual */}
              <div className="hidden lg:flex lg:w-[44%] bg-surface-subtle/30 dark:bg-[#121719]/50 overflow-hidden h-full rounded-r-3xl relative">
                <OnboardingStepVisual stage={currentStage} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {isNavigating && <OnboardingLoadingOverlay />}
    </div>
  );
}

export function OnboardingShell(props: OnboardingShellProps) {
  return (
    <OnboardingNavProvider>
      <OnboardingShellInner {...props} />
    </OnboardingNavProvider>
  );
}


