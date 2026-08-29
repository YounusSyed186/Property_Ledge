'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bell } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ComingSoonPage({
  title,
  description = "We\u2019re working hard to bring this feature to life. Stay tuned for updates.",
  icon: Icon,
}: ComingSoonPageProps) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center min-h-0 h-full w-full p-6 select-none overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-admin-primary/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-md gap-6"
      >
        {/* Icon badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-2xl bg-admin-surface border border-admin-border flex items-center justify-center shadow-lg">
            {Icon ? (
              <Icon className="w-9 h-9 text-admin-primary/70" />
            ) : (
              <Sparkles className="w-9 h-9 text-admin-primary/70" />
            )}
          </div>
          <motion.div
            animate={{ y: [-4, 4, -4], rotate: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-admin-primary flex items-center justify-center shadow-md"
          >
            <Sparkles className="w-3 h-3 text-white" />
          </motion.div>
        </motion.div>

        {/* Coming Soon badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-admin-primary/10 border border-admin-primary/20 text-admin-primary text-xs font-semibold tracking-wide uppercase"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-admin-primary animate-pulse" />
          Coming Soon
        </motion.div>

        {/* Title + description */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="space-y-2"
        >
          <h1 className="text-2xl font-bold font-heading text-admin-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-admin-muted leading-relaxed">{description}</p>
        </motion.div>

        {/* Notify card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full rounded-xl border border-admin-border bg-admin-surface px-5 py-4 flex items-start gap-3 text-left shadow-sm"
        >
          <div className="mt-0.5 w-8 h-8 rounded-lg bg-admin-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-admin-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-admin-foreground">You&apos;ll be notified</p>
            <p className="text-xs text-admin-muted mt-0.5 leading-relaxed">
              When this feature launches, you&apos;ll receive an in-app notification automatically.
            </p>
          </div>
        </motion.div>

        {/* Animated progress dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center gap-1.5"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 }}
              className={`rounded-full bg-admin-primary ${i === 2 ? 'w-4 h-1.5' : 'w-1.5 h-1.5'}`}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
