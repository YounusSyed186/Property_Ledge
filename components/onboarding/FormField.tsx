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
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-admin-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-admin-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs text-admin-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClassName =
  'w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-admin-success/40 focus:border-admin-success transition-colors';
