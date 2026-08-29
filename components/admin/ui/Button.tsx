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
  'inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83]/20 focus-visible:ring-offset-1 focus-visible:ring-offset-background cursor-pointer';

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1 rounded-lg font-semibold',
  md: 'h-8 px-3 text-xs gap-1.5 rounded-lg font-semibold',
  lg: 'h-9 px-4 text-xs gap-2 rounded-lg font-semibold',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#008F83] text-white hover:bg-[#00A99D] active:bg-[#007A70] shadow-xs active:shadow-none font-semibold border border-transparent',
  secondary:
    'bg-surface text-[#273646] dark:text-[#D5DCE3] border border-[#DDE3E8] dark:border-[#1B2B3D] hover:bg-[#F5F8F9] dark:hover:bg-[#0F1D2D] hover:border-[#C8D2D8] dark:hover:border-[#24384E] shadow-2xs font-medium',
  soft:
    'bg-[#E6F7F5] dark:bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] hover:bg-[#008F83]/20 font-semibold border border-transparent',
  ghost:
    'text-muted hover:text-foreground hover:bg-[#F0FBFA] dark:hover:bg-surface-subtle',
  destructive:
    'bg-[#D64545] text-white hover:bg-[#D64545]/90 shadow-xs active:shadow-none font-semibold border border-transparent',
  outline:
    'border border-border text-foreground hover:border-[#008F83] hover:text-[#008F83] bg-transparent',
  icon:
    'w-8 h-8 p-0 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-subtle shadow-2xs',
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