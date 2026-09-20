'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Users,
  UserPlus,
  Crown,
  Edit2,
  Check,
  Plus,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Input, Select, Textarea, useToast, ConfirmDialog } from '@/components/admin/ui';
import {
  handleUpdateLease,
  handleDeleteLease,
  handleConvertToPeriodic,
  fetchAllWorkspaceTenants,
  handleCreateTenant,
  handleUpdateTenant,
} from '@/app/actions/dashboard';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface AssignedTenantItem {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: 'primary' | 'co-tenant' | 'guarantor';
  isPrimary: boolean;
  isModified?: boolean;
}

export interface WorkspaceTenantOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
}

export interface LeaseEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId: string;
  lease?: {
    id: string;
    start_date: string;
    end_date: string | null;
    rent_amount: number;
    rent_frequency: string;
    security_deposit: number;
    payment_due_day: number;
    status: string;
    notes?: string | null;
    property?: any;
    lease_tenants?: Array<{
      role: string;
      is_primary: boolean;
      tenant?: any;
    }>;
  } | null;
}

export function LeaseEditDrawer({
  isOpen,
  onClose,
  onSuccess,
  propertyId,
  lease,
}: LeaseEditDrawerProps) {
  const { success, error: showError } = useToast();

  // Lease Terms State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [rentFrequency, setRentFrequency] = useState('monthly');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('1');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  // Tenant State
  const [assignedTenants, setAssignedTenants] = useState<AssignedTenantItem[]>([]);
  const [availableTenants, setAvailableTenants] = useState<WorkspaceTenantOption[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Assign Existing Tenant State
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');

  // Inline Edit Tenant State
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editTenantForm, setEditTenantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Create New Tenant State
  const [showCreateTenantForm, setShowCreateTenantForm] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'co-tenant' as 'primary' | 'co-tenant' | 'guarantor',
  });
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

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

  // Load available workspace tenants
  useEffect(() => {
    if (isOpen && propertyId) {
      setIsLoadingTenants(true);
      fetchAllWorkspaceTenants(propertyId)
        .then((data) => {
          setAvailableTenants((data || []) as unknown as WorkspaceTenantOption[]);
        })
        .catch((err) => console.error('Failed to load tenants:', err))
        .finally(() => setIsLoadingTenants(false));
    }
  }, [isOpen, propertyId]);

  // Initialize form state from lease prop
  useEffect(() => {
    if (isOpen && lease) {
      setStartDate(lease.start_date || '');
      setEndDate(lease.end_date || '');
      setIsPeriodic(!lease.end_date);
      setRentAmount(lease.rent_amount?.toString() || '');
      setRentFrequency(lease.rent_frequency || 'monthly');
      setSecurityDeposit(lease.security_deposit?.toString() || '');
      setPaymentDueDay(lease.payment_due_day?.toString() || '1');
      setStatus(lease.status || 'active');
      setNotes(lease.notes || '');
      setFormErrors({});
      setShowAssignDropdown(false);
      setShowCreateTenantForm(false);
      setEditingTenantId(null);

      // Initialize assigned tenants
      const existingTenants: AssignedTenantItem[] = (lease.lease_tenants || []).map((lt, idx) => {
        const t = lt.tenant;
        return {
          tenantId: t?.id || `unknown-${idx}`,
          firstName: t?.first_name || '',
          lastName: t?.last_name || '',
          email: t?.email || '',
          phone: t?.phone || '',
          role: (lt.role as 'primary' | 'co-tenant' | 'guarantor') || (lt.is_primary ? 'primary' : 'co-tenant'),
          isPrimary: lt.is_primary ?? (idx === 0),
        };
      });

      // If multiple, ensure one is primary
      if (existingTenants.length > 0 && !existingTenants.some((t) => t.isPrimary)) {
        existingTenants[0].isPrimary = true;
        existingTenants[0].role = 'primary';
      }

      setAssignedTenants(existingTenants);
    }
  }, [isOpen, lease]);

  // Filter unassigned available tenants
  const unassignedTenants = useMemo(() => {
    const assignedIds = new Set(assignedTenants.map((t) => t.tenantId));
    return availableTenants.filter((t) => {
      if (assignedIds.has(t.id)) return false;
      if (!tenantSearchQuery.trim()) return true;
      const q = tenantSearchQuery.toLowerCase();
      const fullName = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase();
      return fullName.includes(q) || (t.email && t.email.toLowerCase().includes(q));
    });
  }, [availableTenants, assignedTenants, tenantSearchQuery]);

  // Handle assigning an existing tenant
  const handleAssignExistingTenant = (tenant: WorkspaceTenantOption) => {
    const isFirst = assignedTenants.length === 0;
    const newAssignment: AssignedTenantItem = {
      tenantId: tenant.id,
      firstName: tenant.first_name || '',
      lastName: tenant.last_name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      role: isFirst ? 'primary' : 'co-tenant',
      isPrimary: isFirst,
    };
    setAssignedTenants((prev) => [...prev, newAssignment]);
    setShowAssignDropdown(false);
    setTenantSearchQuery('');
  };

  // Handle setting primary tenant
  const handleSetPrimaryTenant = (tenantId: string) => {
    setAssignedTenants((prev) =>
      prev.map((t) => {
        if (t.tenantId === tenantId) {
          return { ...t, isPrimary: true, role: 'primary' };
        }
        return {
          ...t,
          isPrimary: false,
          role: t.role === 'primary' ? 'co-tenant' : t.role,
        };
      })
    );
  };

  // Handle changing tenant role
  const handleRoleChange = (tenantId: string, newRole: 'primary' | 'co-tenant' | 'guarantor') => {
    if (newRole === 'primary') {
      handleSetPrimaryTenant(tenantId);
      return;
    }
    setAssignedTenants((prev) =>
      prev.map((t) => {
        if (t.tenantId === tenantId) {
          return { ...t, role: newRole, isPrimary: false };
        }
        return t;
      })
    );
  };

  // Handle removing tenant from lease
  const handleRemoveTenant = (tenantId: string) => {
    setAssignedTenants((prev) => {
      const filtered = prev.filter((t) => t.tenantId !== tenantId);
      if (filtered.length > 0 && !filtered.some((t) => t.isPrimary)) {
        filtered[0].isPrimary = true;
        filtered[0].role = 'primary';
      }
      return filtered;
    });
  };

  // Handle starting inline tenant edit
  const handleStartEditTenant = (tenant: AssignedTenantItem) => {
    setEditingTenantId(tenant.tenantId);
    setEditTenantForm({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone || '',
    });
  };

  // Handle saving inline tenant edit
  const handleSaveTenantEdit = () => {
    if (!editingTenantId) return;
    if (!editTenantForm.firstName.trim()) {
      showError('Validation', 'First name is required.');
      return;
    }
    if (!editTenantForm.email.trim()) {
      showError('Validation', 'Email is required.');
      return;
    }

    setAssignedTenants((prev) =>
      prev.map((t) => {
        if (t.tenantId === editingTenantId) {
          return {
            ...t,
            firstName: editTenantForm.firstName.trim(),
            lastName: editTenantForm.lastName.trim(),
            email: editTenantForm.email.trim(),
            phone: editTenantForm.phone.trim() || null,
            isModified: true,
          };
        }
        return t;
      })
    );
    setEditingTenantId(null);
  };

  // Handle creating a brand new tenant inline
  const handleCreateNewTenantSubmit = async () => {
    if (!newTenantForm.firstName.trim()) {
      showError('Validation', 'First name is required.');
      return;
    }
    if (!newTenantForm.email.trim()) {
      showError('Validation', 'Email is required.');
      return;
    }

    setIsCreatingTenant(true);
    try {
      const res = await handleCreateTenant(propertyId, {
        first_name: newTenantForm.firstName.trim(),
        last_name: newTenantForm.lastName.trim(),
        email: newTenantForm.email.trim().toLowerCase(),
        phone: newTenantForm.phone.trim() || null,
        status: 'active',
      });

      if (!res.success || !res.data) throw new Error('Could not create tenant.');
      const created = res.data as any;

      const isFirst = assignedTenants.length === 0;
      const newAssignment: AssignedTenantItem = {
        tenantId: created.id,
        firstName: created.first_name,
        lastName: created.last_name || '',
        email: created.email,
        phone: created.phone || '',
        role: isFirst ? 'primary' : newTenantForm.role,
        isPrimary: isFirst || newTenantForm.role === 'primary',
      };

      setAssignedTenants((prev) => {
        if (newAssignment.isPrimary) {
          return [
            ...prev.map((t) => ({ ...t, isPrimary: false, role: t.role === 'primary' ? 'co-tenant' : t.role })),
            newAssignment,
          ];
        }
        return [...prev, newAssignment];
      });

      success('Tenant Created & Assigned', `${created.first_name} ${created.last_name || ''} has been assigned to this lease.`);
      setNewTenantForm({ firstName: '', lastName: '', email: '', phone: '', role: 'co-tenant' });
      setShowCreateTenantForm(false);
    } catch (err: any) {
      console.error(err);
      showError('Creation Failed', err.message || 'Could not create new tenant.');
    } finally {
      setIsCreatingTenant(false);
    }
  };

  // Save changes to lease and sync tenant assignments
  const handleSave = async () => {
    if (!lease) return;
    const errors: Record<string, string> = {};
    if (!startDate) errors.startDate = 'Start date is required.';
    if (!isPeriodic && !endDate) errors.endDate = 'End date is required for fixed-term leases.';
    if (!isPeriodic && endDate && startDate && endDate <= startDate) {
      errors.endDate = 'End date must be after start date.';
    }
    if (!rentAmount || Number(rentAmount) <= 0) errors.rentAmount = 'Valid rent amount is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update any modified tenant records
      for (const t of assignedTenants) {
        if (t.isModified && t.tenantId && !t.tenantId.startsWith('unknown-')) {
          await handleUpdateTenant(propertyId, t.tenantId, {
            first_name: t.firstName,
            last_name: t.lastName,
            email: t.email,
            phone: t.phone || null,
          });
        }
      }

      // 2. Prepare tenant assignments payload
      const tenantAssignments = assignedTenants.map((t) => ({
        tenantId: t.tenantId,
        role: t.role,
        isPrimary: t.isPrimary,
      }));

      // 3. Update lease and sync lease_tenants
      const res = await handleUpdateLease(
        propertyId,
        lease.id,
        {
          start_date: startDate,
          end_date: (isPeriodic ? null : endDate || null) as any,
          rent_amount: Number(rentAmount),
          rent_frequency: rentFrequency as any,
          security_deposit: securityDeposit ? Number(securityDeposit) : 0,
          payment_due_day: Number(paymentDueDay) || 1,
          status: status as any,
          notes: notes.trim() || null,
        },
        tenantAssignments
      );

      if (!res.success) throw new Error('Could not update lease.');
      success('Lease Updated', 'The lease agreement and tenant assignments have been saved.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Save failed', err.message || 'Could not update lease.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMakePeriodic = async () => {
    if (!lease) return;
    setIsSaving(true);
    try {
      const res = await handleConvertToPeriodic(propertyId, lease.id);
      if (!res.success) throw new Error('Could not convert lease to periodic.');
      success('Converted to Periodic', 'The lease is now periodic (month-to-month).');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Conversion failed', err.message || 'Could not convert to periodic.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lease) return;
    setIsSaving(true);
    try {
      const res = await handleDeleteLease(propertyId, lease.id);
      if (!res.success) throw new Error('Could not delete lease.');
      success('Lease Deleted', 'The lease agreement record has been removed.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Delete failed', err.message || 'Could not delete lease.');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  const propName = lease?.property?.name || lease?.property?.address_line_1 || 'Property';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans"
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
          'relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl transition-all duration-200 ease-out z-10 p-5 sm:p-8',
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

        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            Edit Lease Agreement
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {propName} · Update terms, rent, and assign or edit tenants.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-5 px-1 py-1 pr-2">
          {/* ==================================================================== */}
          {/* SECTION 1: ASSIGNED TENANTS & MANAGEMENT */}
          {/* ==================================================================== */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#008F83]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Assigned Tenants
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83]">
                  {assignedTenants.length}
                </span>
              </div>

              {/* Action Buttons to Assign / Create */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignDropdown(!showAssignDropdown);
                    setShowCreateTenantForm(false);
                  }}
                  className="text-xs font-semibold text-[#008F83] hover:text-[#007A70] hover:bg-[#008F83]/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Assign Existing</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTenantForm(!showCreateTenantForm);
                    setShowAssignDropdown(false);
                  }}
                  className="text-xs font-semibold text-white bg-[#008F83] hover:bg-[#007A70] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New Tenant</span>
                </button>
              </div>
            </div>

            {/* Dropdown to Assign Existing Tenant */}
            {showAssignDropdown && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-[#008F83]/30 shadow-md space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tenant by name or email..."
                    value={tenantSearchQuery}
                    onChange={(e) => setTenantSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAssignDropdown(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1">
                  {isLoadingTenants ? (
                    <p className="text-xs text-slate-400 py-2 text-center">Loading tenants...</p>
                  ) : unassignedTenants.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 text-center">No available tenants found.</p>
                  ) : (
                    unassignedTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleAssignExistingTenant(t)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar seed={t.id} name={`${t.first_name} ${t.last_name}`} size="sm" decorative />
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                              {t.first_name} {t.last_name}
                            </span>
                            <span className="text-[10.5px] text-slate-400 block truncate">{t.email}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#008F83] shrink-0">+ Assign</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Inline Form to Create & Assign New Tenant */}
            {showCreateTenantForm && (
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-[#008F83]/40 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#008F83]" />
                    Quick Add New Tenant
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateTenantForm(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="First Name *"
                    value={newTenantForm.firstName}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, firstName: e.target.value })}
                    placeholder="e.g. John"
                    className="bg-slate-50 dark:bg-slate-900"
                  />
                  <Input
                    label="Last Name"
                    value={newTenantForm.lastName}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    className="bg-slate-50 dark:bg-slate-900"
                  />
                  <Input
                    label="Email *"
                    type="email"
                    value={newTenantForm.email}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                    placeholder="john@example.com"
                    className="bg-slate-50 dark:bg-slate-900"
                  />
                  <Input
                    label="Phone"
                    value={newTenantForm.phone}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, phone: e.target.value })}
                    placeholder="0400 000 000"
                    className="bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateTenantForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewTenantSubmit}
                    disabled={isCreatingTenant}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#008F83] hover:bg-[#007A70] rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {isCreatingTenant ? 'Creating...' : 'Create & Assign'}
                  </button>
                </div>
              </div>
            )}

            {/* List of currently assigned tenants */}
            <div className="space-y-2">
              {assignedTenants.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    No tenants currently assigned to this lease agreement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAssignDropdown(true)}
                    className="text-xs font-bold text-[#008F83] hover:underline mt-1 inline-block"
                  >
                    + Assign a tenant now
                  </button>
                </div>
              ) : (
                assignedTenants.map((t) => {
                  const isEditingThis = editingTenantId === t.tenantId;

                  return (
                    <div
                      key={t.tenantId}
                      className={cn(
                        'p-3 rounded-xl border transition-all duration-150',
                        t.isPrimary
                          ? 'bg-white dark:bg-slate-800 border-[#008F83]/30 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {!isEditingThis ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Avatar seed={t.tenantId} name={`${t.firstName} ${t.lastName}`} size="md" decorative />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {t.firstName} {t.lastName}
                                </span>
                                {t.isPrimary && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-[#008F83]/15 text-[#008F83] rounded">
                                    <Crown className="w-2.5 h-2.5" /> Primary
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {t.email} {t.phone && `· ${t.phone}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Role selector dropdown */}
                            <select
                              value={t.role}
                              onChange={(e) => handleRoleChange(t.tenantId, e.target.value as any)}
                              className="text-[11px] font-medium py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 border-none text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-1 focus:ring-[#008F83]"
                            >
                              <option value="primary">Primary</option>
                              <option value="co-tenant">Co-Tenant</option>
                              <option value="guarantor">Guarantor</option>
                            </select>

                            {/* Edit tenant info button */}
                            <button
                              type="button"
                              onClick={() => handleStartEditTenant(t)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Edit tenant personal details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Remove tenant from lease button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveTenant(t.tenantId)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                              title="Remove tenant from this lease"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Inline Edit Tenant Details Form */
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                            <span className="text-xs font-bold text-[#008F83] flex items-center gap-1">
                              <Edit2 className="w-3 h-3" /> Edit Tenant Details
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingTenantId(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="First Name"
                              value={editTenantForm.firstName}
                              onChange={(e) => setEditTenantForm({ ...editTenantForm, firstName: e.target.value })}
                              className="bg-slate-50 dark:bg-slate-900"
                            />
                            <Input
                              label="Last Name"
                              value={editTenantForm.lastName}
                              onChange={(e) => setEditTenantForm({ ...editTenantForm, lastName: e.target.value })}
                              className="bg-slate-50 dark:bg-slate-900"
                            />
                            <Input
                              label="Email"
                              type="email"
                              value={editTenantForm.email}
                              onChange={(e) => setEditTenantForm({ ...editTenantForm, email: e.target.value })}
                              className="bg-slate-50 dark:bg-slate-900"
                            />
                            <Input
                              label="Phone"
                              value={editTenantForm.phone}
                              onChange={(e) => setEditTenantForm({ ...editTenantForm, phone: e.target.value })}
                              className="bg-slate-50 dark:bg-slate-900"
                            />
                          </div>
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleSaveTenantEdit}
                              className="px-3 py-1 bg-[#008F83] hover:bg-[#007A70] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" /> Apply Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ==================================================================== */}
          {/* SECTION 2: LEASE TERMS & FINANCIALS */}
          {/* ==================================================================== */}
          {/* Lease Type Segmented Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Lease Agreement Type
              </label>
              {!isPeriodic && (
                <button
                  type="button"
                  onClick={handleMakePeriodic}
                  className="text-xs text-[#008F83] hover:underline font-semibold"
                >
                  Make Periodic
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPeriodic(false)}
                className={cn(
                  'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border',
                  !isPeriodic
                    ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                )}
              >
                Fixed Term
              </button>
              <button
                type="button"
                onClick={() => setIsPeriodic(true)}
                className={cn(
                  'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border',
                  isPeriodic
                    ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                )}
              >
                Periodic (Month-to-Month)
              </button>
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Start Date *"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: '' });
                }}
                className="bg-white dark:bg-slate-800"
              />
              {formErrors.startDate && (
                <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.startDate}</p>
              )}
            </div>

            {!isPeriodic ? (
              <div>
                <Input
                  label="End Date *"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: '' });
                  }}
                  className="bg-white dark:bg-slate-800"
                />
                {formErrors.endDate && (
                  <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.endDate}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center px-1">
                <span className="text-[11px] font-medium text-slate-400">Duration</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ongoing month-to-month agreement</p>
              </div>
            )}
          </div>

          {/* Rent Amount & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Rent Amount ($) *"
                type="number"
                value={rentAmount}
                onChange={(e) => {
                  setRentAmount(e.target.value);
                  if (formErrors.rentAmount) setFormErrors({ ...formErrors, rentAmount: '' });
                }}
                placeholder="e.g. 600"
                className="bg-white dark:bg-slate-800"
              />
              {formErrors.rentAmount && (
                <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.rentAmount}</p>
              )}
            </div>

            <div>
              <Select
                label="Payment Frequency"
                value={rentFrequency}
                onChange={(e) => setRentFrequency(e.target.value)}
                className="bg-white dark:bg-slate-800"
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'fortnightly', label: 'Fortnightly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            </div>
          </div>

          {/* Bond & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Bond / Security Deposit ($)"
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="e.g. 2400"
                className="bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <Select
                label="Lease Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-white dark:bg-slate-800"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'terminated', label: 'Terminated' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>

          {/* Special Terms / Notes */}
          <div>
            <Textarea
              label="Special Terms / Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special conditions, covenants, or clauses..."
              rows={3}
              className="bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 mt-5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {lease ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
              className="h-11 px-3.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-xs transition-colors flex items-center gap-1.5 focus:outline-none"
              title="Delete Lease"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99]"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Lease Record"
        description="Are you sure you want to permanently delete this lease agreement? Attached invoices and payments should be reviewed."
        confirmLabel="Delete Lease"
        variant="danger"
      />
    </div>,
    document.body
  );
}
