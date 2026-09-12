'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { Input, Select, Textarea, useToast, ConfirmDialog } from '@/components/admin/ui';
import { handleCreateTenant, handleUpdateTenant, handleDeleteTenant } from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

export interface TenantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId: string;
  isCreate?: boolean;
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: string;
    notes?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    date_of_birth?: string | null;
  } | null;
}

export function TenantDrawer({
  isOpen,
  onClose,
  onSuccess,
  propertyId,
  isCreate = false,
  tenant,
}: TenantDrawerProps) {
  const { success, error: showError } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      if (tenant && !isCreate) {
        setFirstName(tenant.first_name || '');
        setLastName(tenant.last_name || '');
        setEmail(tenant.email || '');
        setPhone(tenant.phone || '');
        setStatus(tenant.status || 'active');
        setNotes(tenant.notes || '');
        setEmergencyName(tenant.emergency_contact_name || '');
        setEmergencyPhone(tenant.emergency_contact_phone || '');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setStatus('active');
        setNotes('');
        setEmergencyName('');
        setEmergencyPhone('');
      }
      setFormErrors({});
    }
  }, [isOpen, tenant, isCreate]);

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email address.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      if (isCreate) {
        const res = await handleCreateTenant(propertyId, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          status: status as any,
          notes: notes.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
        });
        if (!res.success) throw new Error('Could not create tenant.');
        success('Tenant Created', `${firstName} ${lastName} has been added.`);
      } else if (tenant) {
        const res = await handleUpdateTenant(propertyId, tenant.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          status: status as any,
          notes: notes.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
        });
        if (!res.success) throw new Error('Could not update tenant.');
        success('Tenant Updated', `${firstName} ${lastName}'s profile has been saved.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Save failed', err.message || 'Could not save tenant details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant) return;
    setIsSaving(true);
    try {
      const res = await handleDeleteTenant(propertyId, tenant.id);
      if (!res.success) throw new Error('Could not delete tenant.');
      success('Tenant Removed', 'The tenant record has been archived.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Delete failed', err.message || 'Could not delete tenant.');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out',
          animateIn ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl transition-all duration-200 ease-out z-10 p-6 sm:p-8',
          animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            {isCreate ? 'Add Tenant' : 'Edit Tenant'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update resident contact details and status.
          </p>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="First Name *"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: '' });
                }}
                placeholder="e.g. Jane"
                className="bg-white dark:bg-slate-800"
              />
              {formErrors.firstName && (
                <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.firstName}</p>
              )}
            </div>

            <div>
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Email Address & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Email Address *"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                placeholder="e.g. jane.doe@example.com"
                className="bg-white dark:bg-slate-800"
              />
              {formErrors.email && (
                <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.email}</p>
              )}
            </div>

            <div>
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0412 345 678"
                className="bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-white dark:bg-slate-800"
              options={[
                { value: 'active', label: 'Active Resident' },
                { value: 'inactive', label: 'Inactive / Past Resident' },
                { value: 'prospect', label: 'Prospect / Applicant' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Emergency Contact Name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. Bob Doe (Father)"
                className="bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <Input
                label="Emergency Contact Phone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="e.g. 0400 111 222"
                className="bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <Textarea
              label="Notes / Special Instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes regarding this tenant..."
              rows={3}
              className="bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 mt-6 pt-2">
          {!isCreate && tenant ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
              className="h-12 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-xs transition-colors flex items-center gap-1.5 focus:outline-none"
              title="Archive Tenant"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99]"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Archive Tenant Profile"
        description="Are you sure you want to archive this tenant? They will no longer appear in active resident lists."
        confirmLabel="Archive Tenant"
        variant="danger"
      />
    </div>,
    document.body
  );
}
