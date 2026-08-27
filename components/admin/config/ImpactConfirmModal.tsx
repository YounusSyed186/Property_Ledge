'use client';

import React from 'react';
import { Modal, Button } from '@/components/admin/ui';
import { Check, X } from 'lucide-react';

interface ImpactConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  impactLines?: string[];
  addedPermissions?: string[];
  removedPermissions?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  hideConfirm?: boolean;
}

export function ImpactConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  impactLines = [],
  addedPermissions = [],
  removedPermissions = [],
  confirmLabel = 'Save changes',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  hideConfirm = false,
}: ImpactConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          {!hideConfirm && (
            <Button
              variant={variant === 'danger' ? 'destructive' : 'primary'}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Saving...' : confirmLabel}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {description && <p className="text-sm text-admin-muted">{description}</p>}
        {impactLines.length > 0 && (
          <ul className="text-sm text-admin-foreground space-y-1">
            {impactLines.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        )}
        {addedPermissions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-admin-muted mb-1">Added</p>
            <ul className="space-y-0.5">
              {addedPermissions.map((p) => (
                <li key={p} className="text-sm flex items-center gap-1.5 text-admin-success">
                  <Check className="h-3.5 w-3.5" /> {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {removedPermissions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-admin-muted mb-1">Removed</p>
            <ul className="space-y-0.5">
              {removedPermissions.map((p) => (
                <li key={p} className="text-sm flex items-center gap-1.5 text-admin-danger">
                  <X className="h-3.5 w-3.5" /> {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
