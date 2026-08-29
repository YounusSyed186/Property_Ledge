'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionCardProps {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  name: string;
  className?: string;
}

export function SelectionCard({
  id,
  title,
  description,
  icon,
  selected,
  onSelect,
  name,
  className,
}: SelectionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      whileHover={{ y: selected ? 0 : -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full"
    >
      <label
        htmlFor={id}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 sm:p-4 transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/60 focus-visible:ring-offset-2',
          selected
            ? 'border-admin-primary bg-admin-primary/5 shadow-sm'
            : 'border-admin-border/60 bg-admin-surface hover:border-admin-border hover:shadow-sm',
          className
        )}
      >
        <input
          type="radio"
          id={id}
          name={name}
          checked={selected}
          onChange={onSelect}
          tabIndex={-1}
          className="sr-only"
        />

        {/* Custom Icon wrapper */}
        {icon && (
          <div
            className={cn(
              'shrink-0 p-2 rounded-lg transition-colors duration-200',
              selected
                ? 'bg-admin-primary/10 text-admin-primary'
                : 'bg-admin-surface-subtle text-admin-muted'
            )}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-admin-foreground leading-snug">{title}</p>
          <p className="text-xs text-admin-muted leading-normal mt-0.5">{description}</p>
        </div>

        {/* Elegant check indicator */}
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
            selected ? 'border-admin-primary bg-admin-primary text-white' : 'border-admin-border bg-admin-surface'
          )}
        >
          <AnimatePresence initial={false}>
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </label>
    </motion.div>
  );
}
