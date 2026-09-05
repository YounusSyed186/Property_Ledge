'use client';

import React, { useRef, useEffect } from 'react';
import { Check, Minus, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/admin/ui';

export interface PermissionToggleProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: () => void;
  ariaLabel: string;
  tooltipTitle?: string;
  tooltipKey?: string;
  tooltipDescription?: string;
  disabledReason?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function PermissionToggle({
  checked,
  indeterminate = false,
  disabled = false,
  readOnly = false,
  onChange,
  ariaLabel,
  tooltipTitle,
  tooltipKey,
  tooltipDescription,
  disabledReason,
  className,
  size = 'md',
}: PermissionToggleProps) {
  const isInteractive = !disabled && !readOnly && !!onChange;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInteractive) {
      onChange();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      e.stopPropagation();
      onChange();
    }
  };

  const sizeClasses = size === 'sm' ? 'w-4 h-4 rounded' : 'w-5 h-5 rounded-md';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const control = (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? 0 : -1}
      className={cn(
        'relative inline-flex items-center justify-center transition-all duration-150 select-none outline-none',
        sizeClasses,
        // Active checked state
        checked && !indeterminate && [
          'bg-admin-primary border border-admin-primary text-white shadow-xs',
          isInteractive && 'hover:bg-admin-primary-hover hover:border-admin-primary-hover hover:scale-[1.04]',
        ],
        // Indeterminate state
        indeterminate && [
          'bg-admin-primary/20 border border-admin-primary/60 text-admin-primary',
          isInteractive && 'hover:bg-admin-primary/30 hover:border-admin-primary',
        ],
        // Unchecked state
        !checked && !indeterminate && [
          'bg-admin-surface border border-admin-border/80 text-transparent',
          isInteractive && 'hover:border-admin-primary/60 hover:bg-admin-surface-subtle hover:scale-[1.02]',
        ],
        // Disabled / ReadOnly state
        disabled && 'opacity-35 cursor-not-allowed border-admin-border bg-admin-surface-subtle',
        readOnly && !disabled && 'cursor-default pointer-events-none',
        // Focus state
        'focus-visible:ring-2 focus-visible:ring-admin-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-admin-surface',
        className
      )}
    >
      {checked && !indeterminate && (
        <Check className={cn(iconSize, 'stroke-[2.5] text-white animate-in zoom-in-50 duration-100')} />
      )}
      {indeterminate && (
        <Minus className={cn(iconSize, 'stroke-[3] text-admin-primary animate-in zoom-in-50 duration-100')} />
      )}
      {disabled && !checked && !indeterminate && disabledReason && (
        <Lock className="w-2.5 h-2.5 text-admin-muted/40" />
      )}
    </button>
  );

  const tooltipContent = (
    <div className="flex flex-col gap-1 max-w-xs text-left">
      {tooltipTitle && <span className="font-semibold text-admin-foreground text-xs">{tooltipTitle}</span>}
      {tooltipKey && <code className="text-[10px] text-admin-primary font-mono opacity-90">{tooltipKey}</code>}
      {tooltipDescription && <span className="text-[11px] text-admin-muted leading-tight">{tooltipDescription}</span>}
      {disabledReason && (
        <span className="text-[11px] text-amber-500/90 font-medium pt-0.5 border-t border-admin-border/40 mt-0.5">
          {disabledReason}
        </span>
      )}
    </div>
  );

  if (tooltipTitle || tooltipDescription || disabledReason) {
    return (
      <Tooltip content={tooltipContent} side="top">
        <span className="inline-flex items-center justify-center p-1">{control}</span>
      </Tooltip>
    );
  }

  return <span className="inline-flex items-center justify-center p-1">{control}</span>;
}
