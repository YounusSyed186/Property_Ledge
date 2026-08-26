'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/admin/ui';

export interface NextAction {
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
}

interface NextActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: NextAction[];
}

export function NextActionDialog({
  isOpen,
  onClose,
  title,
  description,
  actions,
}: NextActionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-admin-border">
          <div>
            <h2 className="workspace-page-title">{title}</h2>
            {description && <p className="text-sm text-admin-muted mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-admin-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {actions.map((action) => {
            const content = (
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-admin-border hover:border-admin-primary/50 hover:bg-admin-primary-soft/30 transition-all group">
                <div className="min-w-0">
                  <p className="font-medium text-admin-foreground group-hover:text-admin-primary transition-colors">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-sm text-admin-muted mt-0.5">{action.description}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-admin-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );

            if (action.href) {
              return (
                <Link key={action.label} href={action.href} onClick={onClose}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  action.onClick?.();
                  onClose();
                }}
                className="w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-admin-border flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
