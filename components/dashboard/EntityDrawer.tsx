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
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});
  }, [isOpen, entity, fields, defaultValues]);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const value = formData[field.name];
      if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
        nextErrors[field.name] = `${field.label} is required.`;
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstInvalid = document.getElementById(`entity-field-${Object.keys(nextErrors)[0]}`);
      firstInvalid?.focus();
      return;
    }

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
        const result = await onCreate(propertyId, payload);
        if (!result.success) throw new Error(`We couldn't create this ${title.toLowerCase()}.`);
        success('Created', `${title} created successfully.`);
      } else if (entity) {
        const result = await onUpdate(propertyId, entity.id, payload);
        if (!result.success) throw new Error(`We couldn't update this ${title.toLowerCase()}.`);
        success('Updated', `${title} updated successfully.`);
      }
      onSuccess();
    } catch (err) {
      showError("Couldn't save changes", err instanceof Error ? err.message : 'Your existing information has not been changed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entity || !onDelete) return;
    setIsSaving(true);
    try {
      const result = await onDelete(propertyId, entity.id);
      if (!result.success) throw new Error(`We couldn't delete this ${title.toLowerCase()}.`);
      success('Deleted', `${title} deleted successfully.`);
      onSuccess();
    } catch (err) {
      showError("Couldn't delete record", err instanceof Error ? err.message : 'The record was not deleted.');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const drawerTitle = isCreate ? `Add ${title}` : `Edit ${title}`;
  const drawerDescription = isCreate
    ? `Add a new ${title.toLowerCase()} to your portfolio.`
    : `Review the details and save your changes.`;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={drawerTitle}
        description={drawerDescription}
        width="lg"
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
        <div className="space-y-4 p-1">
          {/* Header Card Summary */}
          {entity && (
            <div className="p-3.5 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">
                  {title} Record
                </p>
                <h4 className="font-extrabold text-sm text-admin-foreground truncate mt-0.5">
                  {String((entity as any)?.name || (entity as any)?.title || (entity as any)?.invoice_number || (entity as any)?.first_name ? `${(entity as any)?.first_name} ${(entity as any)?.last_name || ''}` : `${title} #${entity.id.slice(0, 8)}`)}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-admin-primary-soft text-admin-primary border border-admin-primary/20 shrink-0">
                {String((entity as any)?.status || 'Active')}
              </span>
            </div>
          )}

          <div className="space-y-3.5">
            {fields.map((field) => (
              <div key={field.name}>
                {field.type === 'select' ? (
                  <Select
                    id={`entity-field-${field.name}`}
                    label={field.label + (field.required ? ' *' : '')}
                    value={String(formData[field.name] ?? '')}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    aria-describedby={errors[field.name] ? `entity-error-${field.name}` : undefined}
                    error={errors[field.name]}
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
                    id={`entity-field-${field.name}`}
                    label={field.label + (field.required ? ' *' : '')}
                    value={String(formData[field.name] ?? '')}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    error={errors[field.name]}
                  />
                ) : (
                  <Input
                    id={`entity-field-${field.name}`}
                    label={field.label + (field.required ? ' *' : '')}
                    type={field.type}
                    value={String(formData[field.name] ?? '')}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    error={errors[field.name]}
                  />
                )}
              </div>
            ))}
          </div>
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
