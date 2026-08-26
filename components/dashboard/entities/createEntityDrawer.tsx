'use client';

import React from 'react';
import { EntityDrawer } from '@/components/dashboard/EntityDrawer';
import type { DrawerField } from '@/components/dashboard/EntityDrawer';

interface CreateEntityDrawerProps<T extends { id: string }> {
  title: string;
  fields: DrawerField[];
  defaultValues?: Partial<T>;
  entity: T | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId: string;
  isCreate?: boolean;
  context?: import('@/components/dashboard/EntityDrawer').EntityDrawerContext;
  onCreate: (propertyId: string, data: Record<string, unknown>) => Promise<{ success: boolean }>;
  onUpdate: (propertyId: string, id: string, data: Record<string, unknown>) => Promise<{ success: boolean }>;
  onDelete?: (propertyId: string, id: string) => Promise<{ success: boolean }>;
}

export function createEntityDrawer<T extends { id: string }>(
  title: string,
  fields: DrawerField[],
  handlers: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCreate: (propertyId: string, data: any) => Promise<{ success: boolean }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: (propertyId: string, id: string, data: any) => Promise<{ success: boolean }>;
    onDelete?: (propertyId: string, id: string) => Promise<{ success: boolean }>;
  },
  defaultValues?: Record<string, unknown>
) {
  return function EntityDrawerWrapper(props: Omit<CreateEntityDrawerProps<T>, 'title' | 'fields' | 'onCreate' | 'onUpdate' | 'onDelete' | 'defaultValues'>) {
    return (
      <EntityDrawer<T>
        title={title}
        fields={fields}
        defaultValues={defaultValues}
        onCreate={async (propertyId, data) => handlers.onCreate(propertyId, data as never)}
        onUpdate={async (propertyId, id, data) => handlers.onUpdate(propertyId, id, data as never)}
        onDelete={handlers.onDelete ? async (propertyId, id) => handlers.onDelete!(propertyId, id) : undefined}
        {...props}
      />
    );
  };
}
