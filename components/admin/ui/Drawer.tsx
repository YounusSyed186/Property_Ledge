'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKSPACE_DRAWER_ROOT_ID = 'workspace-drawer-root';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const widthClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
  className,
}: DrawerProps) {
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.getElementById(WORKSPACE_DRAWER_ROOT_ID));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;
    if (isOpen) {
      setMounted(true);
      setAnimateIn(false);
      animFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetRoot = portalRoot || (typeof document !== 'undefined' ? document.body : null);

  if (!mounted || !targetRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ease-out',
          animateIn ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Pop-up Form Dialog */}
      <div
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col rounded-xl border border-admin-border bg-admin-surface text-admin-foreground shadow-elevation-overlay transition-all duration-200 ease-out z-10',
          widthClasses[width],
          animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2',
          className
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-admin-border px-5 sm:px-6 py-4 rounded-t-xl bg-admin-surface">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm sm:text-base font-semibold text-admin-foreground truncate">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-admin-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-admin-muted transition-colors hover:bg-admin-surface-subtle hover:text-admin-foreground"
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-admin-border px-5 sm:px-6 py-3.5 bg-admin-surface-subtle/50 rounded-b-xl">{footer}</div>
        )}
      </div>
    </div>,
    targetRoot
  );
}
