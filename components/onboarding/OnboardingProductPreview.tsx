'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Sparkles, 
  Compass, 
  CreditCard, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  MapPin, 
  ArrowUpRight 
} from 'lucide-react';
import type { OnboardingStage } from '@/lib/onboarding/state';

interface OnboardingProductPreviewProps {
  stage: OnboardingStage;
  workspaceName?: string;
  selectedPlanSlug?: string;
}

export function OnboardingProductPreview({ stage, workspaceName = 'Your Workspace', selectedPlanSlug }: OnboardingProductPreviewProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-admin-background/40 p-8 lg:p-12 xl:p-16 border-l border-admin-border/50">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[500px] mx-auto space-y-8"
        >
          {/* Headline & Description */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-admin-foreground">
              {stage === 'welcome' || stage === 'workspace' && "Your property portfolio, organized."}
              {stage === 'subscription' && "Choose the path that fits your goals."}
              {stage === 'property' && "Your properties, all in one place."}
              {stage === 'ready' && "You're ready to get started."}
            </h2>
            <p className="text-sm text-admin-muted leading-relaxed">
              {stage === 'welcome' || stage === 'workspace' && "Everything you need to manage properties, tenants, leases, and your team — in one place."}
              {stage === 'subscription' && "Select a subscription tier that scales seamlessly with your portfolio's footprint."}
              {stage === 'property' && "A clean dashboard layout mapping all units, tenants, and lease agreements."}
              {stage === 'ready' && "Your PropertyLedge workspace is successfully configured and prepared."}
            </p>
          </div>

          {/* Contextual Visualizations */}
          {(stage === 'welcome' || stage === 'workspace') && (
            <motion.div 
              className="bg-admin-surface rounded-2xl border border-admin-border/60 shadow-xl shadow-admin-border/10 overflow-hidden"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Dashboard Preview Header */}
              <div className="border-b border-admin-border/50 px-6 py-4 flex items-center justify-between bg-admin-surface-subtle/30">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-admin-success/80" />
                  <span className="text-xs font-semibold text-admin-foreground uppercase tracking-wider">{workspaceName}</span>
                </div>
                <span className="text-[10px] bg-admin-border/50 px-2 py-0.5 rounded text-admin-muted font-medium">Live Demo</span>
              </div>

              {/* Metrics Grid */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-admin-border/50 rounded-xl p-4 bg-admin-surface-subtle/10 space-y-1">
                    <span className="text-[10px] font-semibold text-admin-muted uppercase tracking-wider block">Monthly Rent</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-admin-foreground">$24,850</span>
                      <span className="text-[10px] text-admin-success font-medium flex items-center"><TrendingUp className="h-2.5 w-2.5 mr-0.5" />+12.4%</span>
                    </div>
                  </div>
                  <div className="border border-admin-border/50 rounded-xl p-4 bg-admin-surface-subtle/10 space-y-1">
                    <span className="text-[10px] font-semibold text-admin-muted uppercase tracking-wider block">Occupancy</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-admin-foreground">96%</span>
                      <span className="text-[10px] text-admin-muted">Active</span>
                    </div>
                  </div>
                </div>

                {/* Property List Preview */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-admin-foreground tracking-wide uppercase">Portfolio Properties</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Riverside Apartments', type: 'Multifamily', units: 8 },
                      { name: 'Greenfield Office Park', type: 'Commercial', units: 3 },
                      { name: 'Oak Street Retail', type: 'Mixed Use', units: 2 },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-admin-border/40 hover:border-admin-border transition-colors bg-admin-surface-subtle/5">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-admin-success/5 border border-admin-success/10 text-admin-success">
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-admin-foreground">{p.name}</p>
                            <p className="text-[10px] text-admin-muted">{p.type} · {p.units} units</p>
                          </div>
                        </div>
                        <ArrowUpRight className="h-3 w-3 text-admin-muted/60" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'subscription' && (
            <div className="space-y-4">
              {[
                { name: 'Free Trial', price: '$0', desc: 'Try all features risk-free for 14 days', icon: <Compass className="h-4 w-4" />, slug: 'trial' },
                { name: 'Standard / Pro Plan', price: '$49/mo', desc: 'Complete property management for growth', icon: <Sparkles className="h-4 w-4" />, slug: 'pro' },
                { name: 'Enterprise', price: 'Custom', desc: 'Dedicated service for larger portfolios', icon: <CreditCard className="h-4 w-4" />, slug: 'enterprise' }
              ].map((plan, i) => {
                const isSelected = selectedPlanSlug === plan.slug || (plan.slug === 'pro' && !selectedPlanSlug);
                return (
                  <motion.div
                    key={i}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? 'border-admin-success bg-admin-success/5 shadow-md shadow-admin-success/5' 
                        : 'border-admin-border/60 bg-admin-surface hover:border-admin-border'
                    }`}
                    whileHover={{ y: -1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-admin-success/10 text-admin-success' : 'bg-admin-surface-subtle text-admin-muted'}`}>
                          {plan.icon}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-admin-foreground">{plan.name}</p>
                          <p className="text-[10px] text-admin-muted">{plan.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-admin-foreground">{plan.price}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {stage === 'property' && (
            <motion.div 
              className="bg-admin-surface rounded-2xl border border-admin-border/60 shadow-xl shadow-admin-border/10 p-6 space-y-4"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-admin-muted uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" />
                <span>Geographic Overview</span>
              </div>
              <div className="aspect-[4/3] rounded-xl bg-admin-surface-subtle/30 border border-admin-border/50 relative overflow-hidden flex items-center justify-center">
                {/* Fake map drawing */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#808080_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="absolute top-1/3 left-1/4 h-8 w-8 rounded-full bg-admin-success/10 border border-admin-success/20 flex items-center justify-center animate-pulse">
                  <div className="h-3 w-3 rounded-full bg-admin-success" />
                </div>
                <div className="absolute bottom-1/4 right-1/3 h-8 w-8 rounded-full bg-admin-success/10 border border-admin-success/20 flex items-center justify-center animate-pulse delay-1000">
                  <div className="h-3 w-3 rounded-full bg-admin-success" />
                </div>
                <span className="text-[10px] text-admin-muted z-10 font-medium px-3 py-1 bg-admin-surface/90 border border-admin-border/50 rounded-full shadow-sm">Map View Integrated</span>
              </div>
              <div className="flex items-center justify-between border-t border-admin-border/40 pt-4">
                <div>
                  <p className="text-xs font-semibold text-admin-foreground">Sunset Apartments</p>
                  <p className="text-[10px] text-admin-muted">Victoria, Australia</p>
                </div>
                <span className="text-[10px] bg-admin-success/10 text-admin-success border border-admin-success/20 px-2 py-0.5 rounded font-medium">Ready</span>
              </div>
            </motion.div>
          )}

          {stage === 'ready' && (
            <div className="bg-admin-surface rounded-2xl border border-admin-border/60 shadow-xl shadow-admin-border/10 p-6 space-y-6">
              <div className="flex justify-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-admin-success" strokeWidth={1.5} />
                </motion.div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-admin-foreground tracking-wide uppercase">Setup Summary</h4>
                <div className="space-y-2.5">
                  {[
                    { label: 'Workspace Created', val: workspaceName },
                    { label: 'Plan Subscription', val: 'Active / Selected' },
                    { label: 'Property Integration', val: 'Ready' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-admin-surface-subtle/10 border border-admin-border/40 text-xs">
                      <span className="text-admin-muted">{item.label}</span>
                      <span className="font-semibold text-admin-foreground">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
