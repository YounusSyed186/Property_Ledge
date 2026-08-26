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
  width?: 'sm' | 'md' | 'lg';
  className?: string;
}

const widthClasses = {
  sm: 'sm:w-[360px]',
  md: 'sm:w-[420px]',
  lg: 'sm:w-[520px]',
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

  if (!mounted || !portalRoot) return null;

  return createPortal(
    <div className="absolute inset-0 overflow-hidden font-sans" role="dialog" aria-modal="true">
      <div
        className={cn(
          'absolute inset-0 bg-admin-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          animateIn ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-6">
        <div
          className={cn(
            'flex h-full w-full max-w-full flex-col border-l border-admin-border bg-admin-surface text-admin-foreground shadow-elevation-overlay transition-transform duration-300 ease-out',
            widthClasses[width],
            animateIn ? 'translate-x-0' : 'translate-x-full',
            className
          )}
        >
          <div className="flex shrink-0 items-start justify-between border-b border-admin-border px-4 py-3">
            <div className="min-w-0 pr-3">
              <h2 className="text-section-title font-semibold text-admin-foreground truncate">{title}</h2>
              {description && (
                <p className="mt-0.5 text-caption text-admin-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1.5 text-admin-muted transition-colors hover:bg-admin-surface-subtle hover:text-admin-foreground"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-admin-border px-4 py-3">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    portalRoot
  );
}
