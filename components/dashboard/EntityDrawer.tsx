'use client';

import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast, ConfirmDialog, Drawer } from '@/components/admin/ui';

export interface DrawerField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface EntityDrawerContext {
  propertyId?: string;
  propertyName?: string;
  unitId?: string;
  unitName?: string;
  tenantId?: string;
  tenantName?: string;
  leaseId?: string;
  leaseLabel?: string;
}

interface EntityDrawerProps<T extends Record<string, unknown>> {
  title: string;
  entity: T | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId: string;
  isCreate?: boolean;
  fields: DrawerField[];
  defaultValues?: Record<string, unknown>;
  context?: EntityDrawerContext;
  onCreate: (propertyId: string, data: Record<string, unknown>) => Promise<{ success: boolean }>;
  onUpdate: (propertyId: string, id: string, data: Record<string, unknown>) => Promise<{ success: boolean }>;
  onDelete?: (propertyId: string, id: string) => Promise<{ success: boolean }>;
}

export function EntityDrawer<T extends { id: string }>({
  title,
  entity,
  isOpen,
  onClose,
  onSuccess,
  propertyId,
  isCreate = false,
  fields,
  defaultValues = {},
  context,
  onCreate,
  onUpdate,
  onDelete,
}: EntityDrawerProps<T>) {
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, unknown> = { ...defaultValues };
    if (entity) {
      fields.forEach((f) => {
        initial[f.name] = (entity as Record<string, unknown>)[f.name] ?? '';
      });
    } else {
      fields.forEach((f) => {
        initial[f.name] = defaultValues[f.name] ?? '';
      });
    }
    setFormData(initial);
  }, [isOpen, entity, fields, defaultValues]);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        let val = formData[f.name];
        if (f.type === 'number' && val !== '' && val !== undefined) {
          val = Number(val);
        }
        payload[f.name] = val === '' ? null : val;
      });

      if (isCreate) {
        await onCreate(propertyId, payload);
        success('Created', `${title} created successfully.`);
      } else if (entity) {
        await onUpdate(propertyId, entity.id, payload);
        success('Updated', `${title} updated successfully.`);
      }
      onSuccess();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entity || !onDelete) return;
    setIsSaving(true);
    try {
      await onDelete(propertyId, entity.id);
      success('Deleted', `${title} deleted successfully.`);
      onSuccess();
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const drawerTitle = isCreate ? `Add ${title}` : `Edit ${title}`;
  const drawerDescription = isCreate ? `Add a new ${title.toLowerCase()} to your portfolio.` : undefined;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={drawerTitle}
        description={drawerDescription}
        footer={
          <div className="flex items-center justify-between">
            <div>
              {!isCreate && onDelete && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isSaving}>
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : isCreate ? `Create ${title}` : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        {context && (
          <div className="mb-4 flex flex-wrap gap-1.5 border-b border-admin-border pb-3">
            {context.propertyName && (
              <span className="inline-flex items-center rounded-md border border-admin-border bg-admin-surface-subtle px-2 py-0.5 text-[10px] font-medium text-admin-muted">
                Property: {context.propertyName}
              </span>
            )}
            {context.unitName && (
              <span className="inline-flex items-center rounded-md border border-admin-border bg-admin-surface-subtle px-2 py-0.5 text-[10px] font-medium text-admin-muted">
                Unit: {context.unitName}
              </span>
            )}
            {context.tenantName && (
              <span className="inline-flex items-center rounded-md border border-admin-border bg-admin-surface-subtle px-2 py-0.5 text-[10px] font-medium text-admin-muted">
                Tenant: {context.tenantName}
              </span>
            )}
            {context.leaseLabel && (
              <span className="inline-flex items-center rounded-md border border-admin-border bg-admin-surface-subtle px-2 py-0.5 text-[10px] font-medium text-admin-muted">
                Lease: {context.leaseLabel}
              </span>
            )}
          </div>
        )}
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1 block text-[11px] font-medium text-admin-muted">
                {field.label}
                {field.required && <span className="ml-0.5 text-admin-danger">*</span>}
              </label>
              {field.type === 'select' ? (
                <Select
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  type={field.type}
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete ${title}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
