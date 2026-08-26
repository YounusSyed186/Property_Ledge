'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpMenuProps {
  settingsHref?: string;
  className?: string;
}

export function HelpMenu({ settingsHref = '/dashboard/settings', className }: HelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-sidebar-border text-admin-sidebar-muted transition-colors hover:bg-admin-sidebar-hover hover:text-admin-sidebar-foreground"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Help and support"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-md border border-admin-border bg-admin-surface shadow-lg"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-admin-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-admin-muted">Help & Support</p>
            </div>
            <div className="p-1.5">
              <Link
                href={settingsHref}
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-admin-foreground transition-colors hover:bg-admin-surface-subtle"
                role="menuitem"
              >
                Help & Support
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
