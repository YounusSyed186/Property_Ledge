'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Calendar, DollarSign, User, Building } from 'lucide-react';
import { Input, Select, Textarea, useToast, ConfirmDialog } from '@/components/admin/ui';
import { handleUpdateLease, handleDeleteLease, handleConvertToPeriodic } from '@/app/actions/dashboard';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
    unit?: any;
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [rentFrequency, setRentFrequency] = useState('monthly');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('1');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

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
    }
  }, [isOpen, lease]);

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
      const res = await handleUpdateLease(propertyId, lease.id, {
        start_date: startDate,
        end_date: (isPeriodic ? null : endDate || null) as any,
        rent_amount: Number(rentAmount),
        rent_frequency: rentFrequency as any,
        security_deposit: securityDeposit ? Number(securityDeposit) : 0,
        payment_due_day: Number(paymentDueDay) || 1,
        status: status as any,
        notes: notes.trim() || null,
      });

      if (!res.success) throw new Error('Could not update lease.');
      success('Lease Updated', 'The lease agreement details have been saved.');
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

  const primaryTenant = lease?.lease_tenants?.find((lt) => lt.is_primary)?.tenant || lease?.lease_tenants?.[0]?.tenant;
  const tenantName = primaryTenant ? `${primaryTenant.first_name || ''} ${primaryTenant.last_name || ''}`.trim() : 'Resident';
  const propName = lease?.property?.name || lease?.property?.address_line_1 || 'Property';
  const unitInfo = lease?.unit?.unit_number ? ` · Unit ${lease.unit.unit_number}` : '';

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
            Edit Lease Agreement
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update lease terms, rental amounts, and agreement status.
          </p>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {/* Tenant Avatar & Lease Property Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                seed={primaryTenant?.id || lease?.id || 'lease-tenant'}
                name={tenantName}
                size="lg"
                decorative
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {tenantName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {propName}{unitInfo}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-[#008F83] block">
                ${Number(lease?.rent_amount || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {lease?.rent_frequency || 'monthly'}
              </span>
            </div>
          </div>

          {/* Lease Type Segmented Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Lease Type
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
        <div className="flex items-center gap-3 mt-6 pt-2">
          {lease ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
              className="h-12 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-xs transition-colors flex items-center gap-1.5 focus:outline-none"
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
        title="Delete Lease Record"
        description="Are you sure you want to permanently delete this lease agreement? Attached invoices and payments should be reviewed."
        confirmLabel="Delete Lease"
        variant="danger"
      />
    </div>,
    document.body
  );
}
