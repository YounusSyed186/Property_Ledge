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
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-caption font-medium text-admin-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full h-10 px-3.5 rounded-lg bg-admin-sidebar-surface border text-body-sm text-admin-foreground placeholder:text-admin-muted/60 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-admin-primary/40 focus:border-admin-primary',
            'disabled:opacity-50 disabled:pointer-events-none',
            leftIcon && 'pl-10',
            error ? 'border-admin-danger' : 'border-admin-border hover:border-admin-border-subtle',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-admin-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${inputId}-help`} className="text-xs text-admin-muted">
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
}

export function Select({ label, error, helpText, className, id, children, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-caption font-medium text-admin-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full h-10 px-3.5 rounded-lg bg-admin-sidebar-surface border text-body-sm text-admin-foreground transition-all duration-200 appearance-none cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-admin-primary/40 focus:border-admin-primary',
          'disabled:opacity-50 disabled:pointer-events-none',
          error ? 'border-admin-danger' : 'border-admin-border hover:border-admin-border-subtle',
          className
        )}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-admin-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && <p className="text-xs text-admin-muted">{helpText}</p>}
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
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-caption font-medium text-admin-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-lg bg-admin-sidebar-surface border text-body-sm text-admin-foreground placeholder:text-admin-muted/60 transition-all duration-200 resize-y min-h-[80px]',
          'focus:outline-none focus:ring-2 focus:ring-admin-primary/40 focus:border-admin-primary',
          'disabled:opacity-50 disabled:pointer-events-none',
          error ? 'border-admin-danger' : 'border-admin-border hover:border-admin-border-subtle',
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="text-xs text-admin-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && <p className="text-xs text-admin-muted">{helpText}</p>}
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
          'w-4 h-4 rounded border-admin-border bg-admin-sidebar-surface accent-admin-primary cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-admin-primary/40',
          className
        )}
        {...props}
      />
      {label && <span className="text-body-sm text-admin-foreground group-hover:text-admin-primary transition-colors">{label}</span>}
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
        <div className="w-10 h-6 rounded-full bg-admin-border peer-checked:bg-admin-primary transition-colors duration-200 relative">
          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-elevation-1 transition-transform duration-200 peer-checked:translate-x-4" />
        </div>
      </div>
      {label && <span className="text-body-sm text-admin-foreground group-hover:text-admin-primary transition-colors">{label}</span>}
    </label>
  );
}