'use client';

import React from 'react';
import { Drawer, Badge, Button } from '@/components/admin/ui';

export interface DetailSection {
  label: string;
  value: React.ReactNode;
}

interface ConfigDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  badge?: { label: string; variant?: 'neutral' | 'info' | 'warning' };
  sections: DetailSection[];
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export function ConfigDetailDrawer({
  isOpen,
  onClose,
  title,
  description,
  badge,
  sections,
  footer,
  children,
}: ConfigDetailDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      width="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {badge && (
          <Badge variant={badge.variant || 'neutral'} size="sm">
            {badge.label}
          </Badge>
        )}
        {sections.map((section, i) => (
          <div key={i} className="border-b border-admin-border pb-3 last:border-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-admin-muted mb-1">
              {section.label}
            </p>
            <div className="text-sm text-admin-foreground">{section.value}</div>
          </div>
        ))}
        {children}
      </div>
    </Drawer>
  );
}

interface ConfigDetailActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteTooltip?: string;
  editLabel?: string;
  deleteLabel?: string;
}

export function ConfigDetailActions({
  onEdit,
  onDelete,
  deleteDisabled,
  deleteTooltip,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: ConfigDetailActionsProps) {
  return (
    <div className="flex justify-between w-full gap-2">
      {onDelete ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteTooltip}
        >
          {deleteLabel}
        </Button>
      ) : (
        <span />
      )}
      {onEdit && (
        <Button size="sm" onClick={onEdit}>
          {editLabel}
        </Button>
      )}
    </div>
  );
}
