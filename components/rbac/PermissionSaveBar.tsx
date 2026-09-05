'use client';

import React from 'react';
import { Save, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/admin/ui';

export interface PermissionSaveBarProps {
  isVisible: boolean;
  isSaving: boolean;
  roleName: string;
  changesCount: number;
  onDiscard: () => void;
  onSave: () => void;
  className?: string;
}

export function PermissionSaveBar({
  isVisible,
  isSaving,
  roleName,
  changesCount,
  onDiscard,
  onSave,
  className,
}: PermissionSaveBarProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'sticky bottom-4 z-40 w-full max-w-4xl mx-auto px-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-200',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3.5 rounded-2xl',
          'bg-admin-surface/95 backdrop-blur-md border border-admin-primary/40 shadow-2xl shadow-admin-primary/10',
          'text-xs font-sans'
        )}
      >
        {/* Unsaved indicator & description */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-semibold text-admin-foreground">
              Unsaved changes
            </span>
            <span className="text-admin-muted hidden sm:inline">•</span>
            <span className="text-admin-muted truncate">
              Modifications staged for <strong className="text-admin-foreground font-semibold">{roleName}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={onDiscard}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="flex-1 sm:flex-initial"
          >
            Discard
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isSaving}
            onClick={onSave}
            leftIcon={
              isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )
            }
            className="flex-1 sm:flex-initial shadow-xs"
          >
            {isSaving ? 'Saving changes...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
