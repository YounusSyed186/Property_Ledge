'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, useToast, Drawer, ConfirmDialog } from '@/components/admin/ui';
import { handleCreateTenant, handleUpdateTenant, handleDeleteTenant } from '@/app/actions/dashboard';
import { Trash2, User, Mail, Phone, Shield } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

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
        success('Tenant Updated', `${firstName} ${lastName}'s profile has been updated.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Save failed', err.message || 'Could not save tenant.');
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

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={isCreate ? 'Add Tenant' : `Edit ${tenant?.first_name || ''} ${tenant?.last_name || ''}`}
        description={isCreate ? 'Add a new resident profile to this property' : 'Update resident contact details and status'}
        footer={
          <div className="flex items-center justify-between w-full">
            {!isCreate && tenant && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Archive Tenant
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : isCreate ? 'Add Tenant' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 p-1">
          {/* Tenant Avatar Identity Card */}
          <div className="p-4 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center gap-3.5">
            <Avatar
              seed={tenant?.id || `${firstName}_${lastName}`}
              name={`${firstName} ${lastName}`.trim() || 'Tenant Profile'}
              size="lg"
              decorative
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-base text-admin-foreground truncate">
                {`${firstName} ${lastName}`.trim() || 'New Resident'}
              </h3>
              <p className="text-xs text-admin-muted truncate mt-0.5">
                {email || 'No email specified'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-admin-primary" /> Personal Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: '' });
                  }}
                  placeholder="e.g. Jane"
                />
                {formErrors.firstName && <p className="text-[11px] text-red-500 mt-1">{formErrors.firstName}</p>}
              </div>
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-admin-primary" /> Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                />
                {formErrors.email && <p className="text-[11px] text-red-500 mt-1">{formErrors.email}</p>}
              </div>
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0412 345 678"
              />
            </div>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Active Resident' },
                { value: 'inactive', label: 'Inactive / Past Resident' },
                { value: 'prospect', label: 'Prospect / Applicant' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-admin-primary" /> Emergency Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Contact Name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. Bob Doe (Father)"
              />
              <Input
                label="Contact Phone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="e.g. 0400 111 222"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-admin-border">
            <Textarea
              label="Notes / Special Instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes regarding this tenant..."
              rows={3}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Archive Tenant Profile"
        description="Are you sure you want to archive this tenant? They will no longer appear in active resident lists."
        confirmLabel="Archive Tenant"
        variant="danger"
      />
    </>
  );
}
