'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { completeWelcomeStage } from '@/app/actions/onboarding';

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  async function handleContinue() {
    setIsSaving(true);
    try {
      await completeWelcomeStage();
      router.push('/onboarding/workspace');
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  }

  const setupItems = [
    'Set up your management workspace',
    'Choose a pricing plan to fit your goals',
    'Add your first property and units',
  ];

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Welcome"
        title="Let’s get your workspace ready."
        description="We’ll guide you through a few simple steps to get PropertyLedge configured for your property management business."
      >
        {/* Setup preview list */}
        <div className="mt-8 space-y-4">
          {setupItems.map((item, idx) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className="flex items-center gap-3 py-1 cursor-default"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-success/10 text-admin-success">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span className="text-sm tracking-[-0.01em] text-admin-muted">
                {item}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-10 pt-6 border-t border-admin-border/30">
          <motion.button
            onClick={handleContinue}
            disabled={isSaving}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileTap={{ scale: isSaving ? 1 : 0.98 }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg text-xs font-semibold text-white bg-admin-primary hover:bg-admin-primary-hover active:bg-admin-primary-hover/90 transition-colors cursor-pointer select-none shadow-sm shadow-admin-primary/10"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
                <span>Entering workspace...</span>
              </>
            ) : (
              <>
                <span>Get started</span>
                <motion.span
                  animate={{ x: isHovered ? 3.5 : 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className="shrink-0"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.span>
              </>
            )}
          </motion.button>
        </div>

        {/* Existing workspace link */}
        <p className="mt-7 text-xs text-admin-muted cursor-default">
          Already have a workspace?{' '}
          <Link
            href="/dashboard"
            className="font-semibold text-admin-foreground hover:underline underline-offset-4"
          >
            Go to dashboard
          </Link>
        </p>
      </OnboardingStep>
    </OnboardingContent>
  );
}