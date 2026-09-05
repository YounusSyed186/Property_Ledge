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
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md font-medium',
  md: 'h-9 px-3.5 text-xs sm:text-sm gap-2 rounded-md font-medium',
  lg: 'h-10 px-4 text-sm gap-2 rounded-md font-medium',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#008F83] text-white hover:bg-[#007A70] active:bg-[#00665E] shadow-xs active:shadow-none border border-transparent font-medium',
  accent:
    'bg-[#008F83] text-white hover:bg-[#007A70] active:bg-[#00665E] shadow-xs active:shadow-none border border-transparent font-medium',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-surface-subtle hover:border-[#CBD5E1] dark:hover:border-[#334155] shadow-xs font-medium',
  soft:
    'bg-[#F0FBFA] dark:bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] hover:bg-[#E6F7F5] dark:hover:bg-[#008F83]/25 font-medium border border-transparent',
  ghost:
    'text-muted hover:text-foreground hover:bg-surface-subtle',
  destructive:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-xs active:shadow-none font-medium border border-transparent',
  outline:
    'border border-border text-foreground hover:border-[#008F83] hover:text-[#008F83] hover:bg-surface-subtle/50 bg-transparent',
  icon:
    'h-8 w-8 p-0 rounded-md border border-border text-muted hover:text-foreground hover:bg-surface-subtle shadow-xs',
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
    size === 'md' && variant === 'icon' ? 'h-9 w-9 p-0' : size === 'lg' && variant === 'icon' ? 'h-10 w-10 p-0' : sizeStyles[size],
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