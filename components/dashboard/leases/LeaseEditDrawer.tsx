'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, useToast, Drawer, ConfirmDialog } from '@/components/admin/ui';
import { handleUpdateLease, handleDeleteLease, handleConvertToPeriodic } from '@/app/actions/dashboard';
import { Trash2, Calendar, DollarSign, FileText, User, Building } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

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
      success('Lease Updated', 'The lease agreement details have been updated.');
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

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Lease Agreement"
        description="Update dates, rental amounts, frequency, and agreement status"
        footer={
          <div className="flex items-center justify-between w-full">
            {lease && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Lease
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 p-1">
          {/* Tenant Avatar & Lease Property Summary */}
          {(() => {
            const primaryTenant = lease?.lease_tenants?.find((lt) => lt.is_primary)?.tenant || lease?.lease_tenants?.[0]?.tenant;
            const tenantName = primaryTenant ? `${primaryTenant.first_name || ''} ${primaryTenant.last_name || ''}`.trim() : 'Resident';
            const propName = lease?.property?.name || lease?.property?.address_line_1 || 'Property';
            const unitInfo = lease?.unit?.unit_number ? ` · Unit ${lease.unit.unit_number}` : '';

            return (
              <div className="p-4 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    seed={primaryTenant?.id || lease?.id || 'lease-tenant'}
                    name={tenantName}
                    size="lg"
                    decorative
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-base text-admin-foreground truncate">
                      {tenantName}
                    </h3>
                    <p className="text-xs text-admin-muted truncate mt-0.5">
                      {propName}{unitInfo}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-admin-primary uppercase tracking-wider block">
                    ${Number(lease?.rent_amount || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-admin-muted capitalize">
                    {lease?.rent_frequency || 'monthly'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Terms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-admin-primary" /> Lease Term & Dates
              </h4>
              {!isPeriodic && (
                <button
                  type="button"
                  onClick={handleMakePeriodic}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                >
                  Make Periodic
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Lease Type"
                value={isPeriodic ? 'Periodic' : 'Fixed Term'}
                onChange={(e) => setIsPeriodic(e.target.value === 'Periodic')}
                options={[
                  { value: 'Fixed Term', label: 'Fixed Term' },
                  { value: 'Periodic', label: 'Periodic (Month-to-Month)' },
                ]}
              />
              <div>
                <Input
                  label="Start Date *"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: '' });
                  }}
                />
                {formErrors.startDate && <p className="text-[11px] text-red-500 mt-1">{formErrors.startDate}</p>}
              </div>
            </div>

            {!isPeriodic && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    label="End Date *"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: '' });
                    }}
                  />
                  {formErrors.endDate && <p className="text-[11px] text-red-500 mt-1">{formErrors.endDate}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Financials */}
          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Financial Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                />
                {formErrors.rentAmount && <p className="text-[11px] text-red-500 mt-1">{formErrors.rentAmount}</p>}
              </div>
              <Select
                label="Payment Frequency"
                value={rentFrequency}
                onChange={(e) => setRentFrequency(e.target.value)}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'fortnightly', label: 'Fortnightly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Bond / Security Deposit ($)"
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="e.g. 2400"
              />
              <Select
                label="Lease Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
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

          <div className="space-y-4 pt-2 border-t border-admin-border">
            <Textarea
              label="Special Terms / Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special conditions, covenants, or clauses..."
              rows={3}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Lease Record"
        description="Are you sure you want to permanently delete this lease agreement? Attached invoices and payments should be reviewed."
        confirmLabel="Delete Lease"
        variant="danger"
      />
    </>
  );
}
