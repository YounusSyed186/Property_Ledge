'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ id, label, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label 
        htmlFor={id} 
        className="block text-xs sm:text-sm font-semibold text-admin-foreground/80 tracking-tight cursor-default"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-admin-muted font-medium cursor-default">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-admin-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClassName =
  'w-full h-11 sm:h-12 px-4 rounded-xl border border-admin-border/60 bg-admin-surface text-sm sm:text-base text-admin-foreground placeholder:text-admin-muted/60 focus:outline-none focus:ring-2 focus:ring-admin-primary/20 focus:border-admin-primary transition-all duration-150';
