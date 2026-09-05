'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/admin/ui';

export interface UnsavedChangesModalProps {
  isOpen: boolean;
  currentRoleName: string;
  targetRoleName: string;
  onCancel: () => void;
  onConfirmDiscard: () => void;
}

export function UnsavedChangesModal({
  isOpen,
  currentRoleName,
  targetRoleName,
  onCancel,
  onConfirmDiscard,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Unsaved permission changes"
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1 text-xs sm:text-sm text-admin-muted leading-relaxed">
            <p className="text-admin-foreground font-semibold">
              You have unsaved changes for <span className="text-admin-primary">{currentRoleName}</span>.
            </p>
            <p>
              Switching to <span className="font-medium text-admin-foreground">{targetRoleName}</span> will discard your uncommitted permission edits.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-admin-border/60">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Stay on {currentRoleName}
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirmDiscard}>
            Discard & switch role
          </Button>
        </div>
      </div>
    </Modal>
  );
}
