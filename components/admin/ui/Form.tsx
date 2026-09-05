'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   INPUT
   ============================================================ */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, helpText, leftIcon, className, id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full h-9 px-3 rounded-md bg-surface border text-xs text-foreground placeholder:text-muted transition-all duration-150',
            'focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/25',
            'disabled:opacity-50 disabled:pointer-events-none shadow-2xs',
            leftIcon && 'pl-8',
            error
              ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20'
              : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155]',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-[11px] text-[#DC2626] font-medium mt-0.5" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${inputId}-help`} className="text-[11px] text-muted mt-0.5">
          {helpText}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   SELECT
   ============================================================ */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

export function Select({ label, error, helpText, className, id, children, options, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full h-9 px-3 rounded-md bg-surface border text-xs text-foreground transition-all duration-150 cursor-pointer shadow-2xs',
          'focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/25',
          'disabled:opacity-50 disabled:pointer-events-none',
          error
            ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20'
            : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155]',
          className
        )}
        aria-invalid={!!error}
        {...props}
      >
        {children ||
          options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
      {error && (
        <p className="text-[11px] text-[#DC2626] font-medium mt-0.5" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && <p className="text-[11px] text-muted mt-0.5">{helpText}</p>}
    </div>
  );
}

/* ============================================================
   TEXTAREA
   ============================================================ */

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Textarea({ label, error, helpText, className, id, ...props }: TextareaProps) {
  const textareaId = id || props.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full px-3 py-2 rounded-md bg-surface border text-xs text-foreground placeholder:text-muted transition-all duration-150 resize-y min-h-[80px] shadow-2xs',
          'focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/25',
          'disabled:opacity-50 disabled:pointer-events-none',
          error
            ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20'
            : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155]',
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="text-[11px] text-[#DC2626] font-medium mt-0.5" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && <p className="text-[11px] text-muted mt-0.5">{helpText}</p>}
    </div>
  );
}

/* ============================================================
   CHECKBOX
   ============================================================ */

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const checkboxId = id || props.name;
  return (
    <label htmlFor={checkboxId} className="flex items-center gap-2.5 cursor-pointer select-none group">
      <input
        type="checkbox"
        id={checkboxId}
        className={cn(
          'w-4 h-4 rounded border-[#CBD4DB] dark:border-[#1B2B3D] bg-surface text-[#008F83] accent-[#008F83] cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-[#008F83]/30',
          className
        )}
        {...props}
      />
      {label && <span className="text-body-sm text-[#182536] dark:text-[#F4F7F9] group-hover:text-[#008F83] transition-colors">{label}</span>}
    </label>
  );
}

/* ============================================================
   SWITCH
   ============================================================ */

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Switch({ label, className, id, ...props }: SwitchProps) {
  const switchId = id || props.name;
  return (
    <label htmlFor={switchId} className="flex items-center gap-3 cursor-pointer select-none group">
      <div className="relative">
        <input
          type="checkbox"
          id={switchId}
          className="peer sr-only"
          {...props}
        />
        <div className="w-10 h-6 rounded-full bg-[#DCE2E7] dark:bg-[#1B2B3D] peer-checked:bg-[#008F83] transition-colors duration-200 relative">
          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 peer-checked:translate-x-4" />
        </div>
      </div>
      {label && <span className="text-body-sm text-[#182536] dark:text-[#F4F7F9] group-hover:text-[#008F83] transition-colors">{label}</span>}
    </label>
  );
}