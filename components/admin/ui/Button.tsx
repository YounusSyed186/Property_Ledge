'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'destructive' | 'outline' | 'icon' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  withArrow?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background cursor-pointer active:scale-[0.98]';

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-2 rounded-xl font-semibold',
  md: 'h-10 px-4 text-[14px] gap-2.5 rounded-xl font-semibold',
  lg: 'h-12 px-5 text-[15px] gap-3 rounded-xl font-semibold',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#008F83] text-white hover:bg-[#007A70] active:bg-[#00665E] shadow-xs hover:shadow-sm active:shadow-none border border-[#007A70]/40 font-semibold',
  accent:
    'bg-[#008F83] text-white hover:bg-[#007A70] active:bg-[#00665E] shadow-xs hover:shadow-sm active:shadow-none border border-[#007A70]/40 font-semibold',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-surface-subtle hover:border-[#CBD5E1] dark:hover:border-[#334155] shadow-xs font-semibold',
  soft:
    'bg-[#F0FBFA] dark:bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] hover:bg-[#E6F7F5] dark:hover:bg-[#008F83]/25 font-semibold border border-[#008F83]/20',
  ghost:
    'text-muted hover:text-foreground hover:bg-surface-subtle font-medium',
  destructive:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-xs hover:shadow-sm active:shadow-none font-semibold border border-[#B91C1C]/40',
  outline:
    'border border-border text-foreground hover:border-[#008F83] hover:text-[#008F83] hover:bg-surface-subtle bg-surface shadow-xs font-semibold',
  icon:
    'h-10 w-10 p-0 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface-subtle shadow-xs',
};

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  loading = false,
  leftIcon,
  rightIcon,
  withArrow = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    baseStyles,
    variant === 'icon'
      ? size === 'sm'
        ? 'h-9 w-9 p-0 rounded-xl'
        : size === 'lg'
        ? 'h-12 w-12 p-0 rounded-xl'
        : 'h-10 w-10 p-0 rounded-xl'
      : sizeStyles[size],
    variantStyles[variant],
    className
  );

  const content = (
    <>
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {withArrow && (
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
      )}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('inline-flex', disabled && 'pointer-events-none opacity-50')} aria-disabled={disabled}>
        <motion.div
          whileHover={{ scale: disabled ? 1 : 1.01 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          transition={{ duration: 0.1 }}
          className={classes}
        >
          {content}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      className={classes}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {content}
    </motion.button>
  );
}