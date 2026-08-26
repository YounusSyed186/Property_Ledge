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
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm transition-colors duration-150 text-left',
        'disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/40',
        danger
          ? 'text-admin-danger hover:bg-admin-danger-soft'
          : active
          ? 'text-admin-primary bg-admin-primary-soft font-medium'
          : 'text-admin-foreground hover:bg-admin-surface-subtle'
      )}
      role="menuitem"
    >
      {icon && (
        <span className={cn('shrink-0', danger ? 'text-admin-danger' : active ? 'text-admin-primary' : 'text-admin-muted')}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {description && <span className="block text-metadata text-admin-muted mt-0.5 truncate">{description}</span>}
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
        'inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-body-sm font-medium transition-all duration-200 border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/40',
        variant === 'secondary'
          ? 'bg-admin-surface text-admin-foreground border-admin-border hover:bg-admin-surface-elevated hover:border-admin-border-subtle'
          : 'bg-transparent text-admin-muted border-transparent hover:text-admin-foreground hover:bg-admin-surface-subtle',
        className
      )}
      {...props}
    >
      {icon}
      {label}
      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
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
            'absolute z-dropdown mt-2 min-w-[220px] p-1.5 bg-admin-surface-elevated border border-admin-border rounded-xl shadow-elevation-3 animate-slide-up',
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