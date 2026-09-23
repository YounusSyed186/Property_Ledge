'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

/* ============================================================
   DROPDOWN ITEM
   ============================================================ */

interface DropdownItemProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}

export function DropdownItem({
  icon,
  label,
  description,
  onClick,
  disabled = false,
  danger = false,
  active = false,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 text-left',
        'disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83]/40',
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          : active
          ? 'text-[#008F83] bg-[#008F83]/10 font-bold'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
      )}
      role="menuitem"
    >
      {icon && (
        <span className={cn('shrink-0', danger ? 'text-rose-600' : active ? 'text-[#008F83]' : 'text-slate-400')}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {description && <span className="block text-[11px] text-slate-400 mt-0.5 truncate">{description}</span>}
      </span>
    </button>
  );
}

/* ============================================================
   DROPDOWN TRIGGER (standard button trigger)
   ============================================================ */

interface DropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'secondary' | 'ghost';
}

export function DropdownTrigger({ label, icon, variant = 'secondary', className, ...props }: DropdownTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl text-xs font-medium transition-all duration-200 border shadow-xs',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83]/40',
        variant === 'secondary'
          ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300'
          : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      )}
      {...props}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
    </button>
  );
}

/* ============================================================
   DROPDOWN
   ============================================================ */

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
  label?: string;
}

export function Dropdown({ trigger, children, align = 'end', className, label }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Clone the trigger element to inject onClick and aria attributes
  const triggerWithProps = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        },
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-label': label,
      })
    : trigger;

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {triggerWithProps}

      {isOpen && (
        <div
          className={cn(
            'absolute z-dropdown mt-2 min-w-[220px] p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl animate-slide-up',
            align === 'end' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}