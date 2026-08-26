'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'destructive' | 'outline' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const baseStyles =
  'inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary focus-visible:ring-offset-2 focus-visible:ring-offset-admin-background cursor-pointer';

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1 rounded-md font-semibold',
  md: 'h-8 px-3 text-xs gap-1.5 rounded-md font-semibold',
  lg: 'h-9 px-4 text-xs gap-2 rounded-md font-semibold',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-admin-primary text-white hover:bg-admin-primary-hover shadow-xs active:shadow-none font-semibold',
  secondary:
    'bg-admin-surface text-admin-foreground border border-admin-border-strong hover:bg-admin-surface-elevated shadow-2xs',
  soft:
    'bg-admin-primary-soft text-admin-primary-hover hover:bg-admin-primary-soft/80 font-semibold',
  ghost:
    'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle',
  destructive:
    'bg-admin-danger text-white hover:bg-admin-danger/90 shadow-xs active:shadow-none font-semibold',
  outline:
    'border border-admin-border text-admin-foreground hover:border-admin-primary hover:text-admin-primary bg-transparent',
  icon:
    'w-9 h-9 p-0 rounded-xl border border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle shadow-2xs',
};

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(baseStyles, sizeStyles[size], variantStyles[variant], className);

  const content = (
    <>
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block" aria-disabled={disabled}>
        <motion.div
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={classes}
        >
          {content}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={classes}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {content}
    </motion.button>
  );
}