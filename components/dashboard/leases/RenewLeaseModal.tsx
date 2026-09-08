'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Users,
  Building,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { handleRenewLease, fetchAllWorkspaceTenants } from '@/app/actions/dashboard';
import { formatCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';
import type { LeaseStatus, RentFrequency } from '@/modules/leases/domain/entities/lease';

interface TenantRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
}

interface LeaseTenantEntry {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'primary' | 'co-tenant' | 'guarantor';
  isPrimary: boolean;
  selected: boolean;
}

export interface RenewLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  previousLease: {
    id: string;
    property_id: string;
    unit_id?: string | null;
    start_date: string;
    end_date: string | null;
    rent_amount: number;
    security_deposit: number;
    payment_due_day: number;
    rent_frequency: string;
    status: string;
    notes?: string | null;
    property?: {
      id: string;
      name: string;
      address_line_1: string;
      city?: string;
    } | null;
    unit?: {
      id: string;
      unit_number: string;
    } | null;
    lease_tenants?: Array<{
      role: string;
      is_primary: boolean;
      tenant_id?: string;
      tenant?: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
      } | null;
    }>;
  };
}

export function RenewLeaseModal({
  isOpen,
  onClose,
  onSuccess,
  previousLease,
}: RenewLeaseModalProps) {
  const { success: showSuccess, error: showError } = useToast();

  // Wizard steps: 0 = Terms & Tenants, 1 = Review & Confirm
  const [step, setStep] = useState<0 | 1>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rentFrequency, setRentFrequency] = useState<RentFrequency>('monthly');
  const [paymentDueDay, setPaymentDueDay] = useState('1');
  const [notes, setNotes] = useState('');

  // Tenant State
  const [tenantsList, setTenantsList] = useState<LeaseTenantEntry[]>([]);
  const [allWorkspaceTenants, setAllWorkspaceTenants] = useState<TenantRecord[]>([]);
  const [isAddingTenant, setIsAddingTenant] = useState(false);
  const [selectedAddTenantId, setSelectedAddTenantId] = useState('');

  // Initialize data from previous lease
  useEffect(() => {
    if (!isOpen || !previousLease) return;

    setStep(0);
    setValidationError(null);
    setIsSubmitting(false);

    // Calculate default new start date: next day after previous end date, or today
    let calculatedStart = '';
    if (previousLease.end_date) {
      const prevEnd = new Date(previousLease.end_date);
      prevEnd.setDate(prevEnd.getDate() + 1);
      calculatedStart = prevEnd.toISOString().split('T')[0];
    } else {
      calculatedStart = new Date().toISOString().split('T')[0];
    }
    setStartDate(calculatedStart);

    // Calculate default 1-year end date
    if (calculatedStart) {
      const defaultEnd = new Date(calculatedStart);
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
      defaultEnd.setDate(defaultEnd.getDate() - 1);
      setEndDate(defaultEnd.toISOString().split('T')[0]);
    } else {
      setEndDate('');
    }

    setIsPeriodic(!previousLease.end_date);
    setRentAmount(String(previousLease.rent_amount ?? ''));
    setSecurityDeposit(String(previousLease.security_deposit ?? ''));
    setRentFrequency((previousLease.rent_frequency as RentFrequency) || 'monthly');
    setPaymentDueDay(String(previousLease.payment_due_day || 1));
    setNotes('');

    // Prepopulate tenants from previous lease
    const initialTenants: LeaseTenantEntry[] = (previousLease.lease_tenants || []).map((lt, idx) => {
      const t = lt.tenant;
      return {
        tenantId: t?.id || lt.tenant_id || `tenant-${idx}`,
        firstName: t?.first_name || '',
        lastName: t?.last_name || '',
        email: t?.email || '',
        role: (lt.role as 'primary' | 'co-tenant' | 'guarantor') || (idx === 0 ? 'primary' : 'co-tenant'),
        isPrimary: lt.is_primary || idx === 0,
        selected: true,
      };
    });
    setTenantsList(initialTenants);

    // Fetch workspace tenants in case user wants to add another existing tenant
    fetchAllWorkspaceTenants()
      .then((data) => {
        setAllWorkspaceTenants((data || []) as unknown as TenantRecord[]);
      })
      .catch((err) => console.error('Error fetching tenants for renewal:', err));
  }, [isOpen, previousLease]);

  if (!isOpen) return null;

  const previousLeaseCode = `LS-${previousLease.id.slice(0, 8).toUpperCase()}`;
  const propertyTitle = previousLease.property?.name || previousLease.property?.address_line_1 || 'Property';
  const unitTitle = previousLease.unit?.unit_number ? `Unit ${previousLease.unit.unit_number}` : null;

  // Presets for quick lease duration
  const applyDurationPreset = (months: number) => {
    if (!startDate) return;
    setIsPeriodic(false);
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const selectedTenants = tenantsList.filter((t) => t.selected);

  const handleToggleTenant = (tenantId: string) => {
    setTenantsList((prev) => {
      const updated = prev.map((t) => {
        if (t.tenantId === tenantId) {
          const nextSelected = !t.selected;
          return { ...t, selected: nextSelected, isPrimary: nextSelected ? t.isPrimary : false };
        }
        return t;
      });

      // Ensure at least one selected tenant is primary
      const active = updated.filter((t) => t.selected);
      if (active.length > 0 && !active.some((t) => t.isPrimary)) {
        active[0].isPrimary = true;
        active[0].role = 'primary';
      }
      return updated;
    });
  };

  const handleSetPrimaryTenant = (tenantId: string) => {
    setTenantsList((prev) =>
      prev.map((t) => ({
        ...t,
        isPrimary: t.tenantId === tenantId,
        role: t.tenantId === tenantId ? 'primary' : 'co-tenant',
      }))
    );
  };

  const handleAddExistingTenant = () => {
    if (!selectedAddTenantId) return;
    const found = allWorkspaceTenants.find((t) => t.id === selectedAddTenantId);
    if (!found) return;

    // Check if already in list
    const existingIndex = tenantsList.findIndex((t) => t.tenantId === found.id);
    if (existingIndex >= 0) {
      setTenantsList((prev) =>
        prev.map((t, idx) => (idx === existingIndex ? { ...t, selected: true } : t))
      );
    } else {
      const hasAnySelected = tenantsList.some((t) => t.selected);
      setTenantsList((prev) => [
        ...prev,
        {
          tenantId: found.id,
          firstName: found.first_name,
          lastName: found.last_name,
          email: found.email,
          role: hasAnySelected ? 'co-tenant' : 'primary',
          isPrimary: !hasAnySelected,
          selected: true,
        },
      ]);
    }
    setSelectedAddTenantId('');
    setIsAddingTenant(false);
  };

  const validateTermsStep = (): boolean => {
    setValidationError(null);

    if (!startDate) {
      setValidationError('New lease start date is required.');
      return false;
    }
    if (!isPeriodic && !endDate) {
      setValidationError('New lease end date is required for fixed term contracts.');
      return false;
    }
    if (!isPeriodic && endDate && new Date(endDate) < new Date(startDate)) {
      setValidationError('New end date must be on or after new start date.');
      return false;
    }
    const rentNum = Number(rentAmount);
    if (isNaN(rentNum) || rentNum < 0) {
      setValidationError('Valid positive rent amount is required.');
      return false;
    }
    const depositNum = Number(securityDeposit);
    if (isNaN(depositNum) || depositNum < 0) {
      setValidationError('Security deposit must be a positive number.');
      return false;
    }
    if (selectedTenants.length === 0) {
      setValidationError('Please select at least one tenant to continue on the renewed lease.');
      return false;
    }
    return true;
  };

  const handleProceedToReview = () => {
    if (validateTermsStep()) {
      setStep(1);
    }
  };

  const handleConfirmRenewal = async () => {
    if (isSubmitting) return; // Prevent double submit
    setIsSubmitting(true);
    setValidationError(null);

    try {
      const tenantAssignments = selectedTenants.map((t) => ({
        tenantId: t.tenantId,
        role: t.role,
        isPrimary: t.isPrimary,
      }));

      const res = await handleRenewLease(previousLease.id, {
        previousLeaseId: previousLease.id,
        propertyId: previousLease.property_id,
        unitId: previousLease.unit_id || null,
        startDate,
        endDate: isPeriodic ? null : endDate,
        rentAmount: Number(rentAmount),
        securityDeposit: Number(securityDeposit || 0),
        rentFrequency,
        paymentDueDay: Number(paymentDueDay || 1),
        notes: notes.trim() ? notes.trim() : null,
        tenantAssignments,
      });

      if (res?.success) {
        showSuccess(
          'Lease Renewed Successfully',
          `New contract created. Previous lease (${previousLeaseCode}) preserved as historical.`
        );
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      console.error('Lease renewal error:', err);
      setValidationError(err.message || 'The renewal could not be completed. No changes were made.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border bg-admin-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/10 flex items-center justify-center text-admin-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-admin-foreground">Renew Lease</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
                  Ref: {previousLeaseCode}
                </span>
              </div>
              <p className="text-xs text-admin-muted">
                {propertyTitle} {unitTitle && `· ${unitTitle}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="flex border-b border-admin-border bg-admin-surface text-xs font-semibold">
          <button
            onClick={() => setStep(0)}
            disabled={isSubmitting}
            className={cn(
              'flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2',
              step === 0
                ? 'border-admin-primary text-admin-primary bg-admin-primary/5'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            )}
          >
            <span className="w-5 h-5 rounded-full bg-admin-primary/10 text-admin-primary flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            New Terms & Tenants
          </button>
          <button
            onClick={handleProceedToReview}
            disabled={isSubmitting}
            className={cn(
              'flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2',
              step === 1
                ? 'border-admin-primary text-admin-primary bg-admin-primary/5'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            )}
          >
            <span className="w-5 h-5 rounded-full bg-admin-primary/10 text-admin-primary flex items-center justify-center text-[11px] font-bold">
              2
            </span>
            Review & Confirm
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {step === 0 ? (
            <>
              {/* Previous Lease Reference Card */}
              <div className="rounded-xl border border-admin-border bg-admin-surface-elevated p-4">
                <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-2">
                  Current Historical Reference
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-admin-muted block">Period</span>
                    <span className="font-semibold text-admin-foreground">
                      {previousLease.start_date} → {previousLease.end_date || 'Periodic'}
                    </span>
                  </div>
                  <div>
                    <span className="text-admin-muted block">Current Rent</span>
                    <span className="font-semibold text-admin-foreground">
                      {formatCurrency(previousLease.rent_amount)} / {previousLease.rent_frequency}
                    </span>
                  </div>
                  <div>
                    <span className="text-admin-muted block">Security Deposit</span>
                    <span className="font-semibold text-admin-foreground">
                      {formatCurrency(previousLease.security_deposit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-admin-muted block">Due Day</span>
                    <span className="font-semibold text-admin-foreground">
                      Day {previousLease.payment_due_day || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 0A: New Lease Term Dates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-admin-foreground flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-admin-primary" /> New Lease Term
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyDurationPreset(12)}
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-admin-surface-elevated border border-admin-border hover:border-admin-primary text-admin-foreground transition-colors"
                    >
                      +1 Year
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDurationPreset(6)}
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-admin-surface-elevated border border-admin-border hover:border-admin-primary text-admin-foreground transition-colors"
                    >
                      +6 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPeriodic(true);
                        setEndDate('');
                      }}
                      className={cn(
                        'px-2 py-1 text-[11px] font-semibold rounded border transition-colors',
                        isPeriodic
                          ? 'bg-admin-primary/10 border-admin-primary text-admin-primary'
                          : 'bg-admin-surface-elevated border-admin-border hover:border-admin-primary text-admin-foreground'
                      )}
                    >
                      Periodic
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-admin-muted mb-1">
                      New Start Date *
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-admin-muted mb-1">
                      New End Date {isPeriodic ? '(Periodic / Open-ended)' : '*'}
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      disabled={isPeriodic}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (e.target.value) setIsPeriodic(false);
                      }}
                      placeholder={isPeriodic ? 'No end date' : ''}
                    />
                  </div>
                </div>
              </div>

              {/* Step 0B: Financials */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-admin-foreground flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> New Financial Terms
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-admin-muted mb-1">
                      Rent Amount (₹) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="e.g. 27000"
                      required
                    />
                    {Number(rentAmount) > Number(previousLease.rent_amount) && (
                      <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
                        ↑ Rent increase of {formatCurrency(Number(rentAmount) - Number(previousLease.rent_amount))}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-admin-muted mb-1">
                      Rent Frequency
                    </label>
                    <Select
                      value={rentFrequency}
                      onChange={(e) => setRentFrequency(e.target.value as RentFrequency)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-admin-muted mb-1">
                      Security Deposit (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="e.g. 54000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-admin-muted mb-1">
                      Payment Due Day (1–31)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={paymentDueDay}
                      onChange={(e) => setPaymentDueDay(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 0C: Tenant Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-admin-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-500" /> Tenants on Renewal
                  </label>
                  {!isAddingTenant && (
                    <button
                      type="button"
                      onClick={() => setIsAddingTenant(true)}
                      className="text-xs font-bold text-admin-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Tenant
                    </button>
                  )}
                </div>

                <p className="text-xs text-admin-muted">
                  Select which tenants will be included in the new contract. Existing tenant profiles are reused without duplication. If a tenant is removed, their profile remains safe in the database and on the old lease.
                </p>

                {/* Tenant Checkbox List */}
                <div className="space-y-2">
                  {tenantsList.map((t) => {
                    const fullName = `${t.firstName} ${t.lastName}`.trim() || 'Tenant';
                    return (
                      <div
                        key={t.tenantId}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-colors',
                          t.selected
                            ? 'bg-admin-surface-elevated border-admin-primary/40'
                            : 'bg-admin-surface border-admin-border opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={t.selected}
                            onChange={() => handleToggleTenant(t.tenantId)}
                            className="w-4 h-4 text-admin-primary rounded border-admin-border focus:ring-admin-primary"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-admin-foreground">
                                {fullName}
                              </span>
                              {t.isPrimary && t.selected && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                  Primary
                                </span>
                              )}
                              {!t.isPrimary && t.selected && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-admin-surface text-admin-muted border border-admin-border">
                                  Co-Tenant
                                </span>
                              )}
                              {!t.selected && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600">
                                  Leaving / Excluded
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-admin-muted">{t.email}</span>
                          </div>
                        </div>

                        {t.selected && !t.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryTenant(t.tenantId)}
                            className="text-[11px] font-semibold text-admin-muted hover:text-admin-primary underline"
                          >
                            Make Primary
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Existing Tenant Dropdown */}
                {isAddingTenant && (
                  <div className="p-3 rounded-xl border border-admin-border bg-admin-surface-elevated space-y-2">
                    <label className="block text-xs font-semibold text-admin-foreground">
                      Select Tenant from Workspace:
                    </label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedAddTenantId}
                        onChange={(e) => setSelectedAddTenantId(e.target.value)}
                        className="flex-1"
                      >
                        <option value="">-- Choose Existing Tenant --</option>
                        {allWorkspaceTenants
                          .filter((wt) => !tenantsList.some((t) => t.tenantId === wt.id && t.selected))
                          .map((wt) => (
                            <option key={wt.id} value={wt.id}>
                              {wt.first_name} {wt.last_name} ({wt.email})
                            </option>
                          ))}
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAddExistingTenant}
                        disabled={!selectedAddTenantId}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => setIsAddingTenant(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-admin-muted mb-1">
                  Renewal Notes (Optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Approved 8% rent escalation; Sarah vacated as agreed."
                  rows={2}
                />
              </div>
            </>
          ) : (
            /* Step 1: Review & Confirm Screen */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Renewal Guarantee</span>
                </div>
                <p>
                  This will generate a completely <strong>NEW active lease</strong> with a new immutable Lease ID, linking to <strong>{previousLeaseCode}</strong>. The previous lease will be transitioned to <strong>Renewed</strong> status and preserved in full historical records.
                </p>
              </div>

              {/* Comparison Summary Card */}
              <div className="border border-admin-border rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-admin-surface-elevated border-b border-admin-border text-admin-muted font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Term Element</th>
                      <th className="py-2.5 px-4">Previous Contract ({previousLeaseCode})</th>
                      <th className="py-2.5 px-4 text-admin-primary">New Renewal Contract</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border font-medium">
                    <tr>
                      <td className="py-2.5 px-4 text-admin-muted">Property</td>
                      <td className="py-2.5 px-4 text-admin-foreground">{propertyTitle}</td>
                      <td className="py-2.5 px-4 text-admin-foreground font-bold">{propertyTitle}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-admin-muted">Lease Period</td>
                      <td className="py-2.5 px-4 text-admin-foreground">
                        {previousLease.start_date} → {previousLease.end_date || 'Periodic'}
                      </td>
                      <td className="py-2.5 px-4 text-admin-primary font-bold">
                        {startDate} → {isPeriodic ? 'Periodic' : endDate}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-admin-muted">Rent Amount</td>
                      <td className="py-2.5 px-4 text-admin-foreground">
                        {formatCurrency(previousLease.rent_amount)} / {previousLease.rent_frequency}
                      </td>
                      <td className="py-2.5 px-4 text-admin-primary font-bold">
                        {formatCurrency(Number(rentAmount))} / {rentFrequency}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-admin-muted">Security Deposit</td>
                      <td className="py-2.5 px-4 text-admin-foreground">
                        {formatCurrency(previousLease.security_deposit)}
                      </td>
                      <td className="py-2.5 px-4 text-admin-foreground font-bold">
                        {formatCurrency(Number(securityDeposit || 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-admin-muted">Tenants</td>
                      <td className="py-2.5 px-4 text-admin-foreground">
                        {(previousLease.lease_tenants || [])
                          .map((lt) => `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim())
                          .filter(Boolean)
                          .join(', ') || 'None'}
                      </td>
                      <td className="py-2.5 px-4 text-admin-primary font-bold">
                        {selectedTenants
                          .map((t) => `${t.firstName} ${t.lastName}${t.isPrimary ? ' (Primary)' : ''}`)
                          .join(', ')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {notes && (
                <div className="p-3 rounded-lg bg-admin-surface-elevated border border-admin-border text-xs">
                  <span className="font-bold text-admin-muted block mb-1">Notes:</span>
                  <p className="text-admin-foreground">{notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-admin-border bg-admin-surface-elevated">
          {step === 0 ? (
            <>
              <Button
                variant="soft"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToReview}
                className="gap-2 font-bold"
              >
                Review Renewal Terms <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="soft"
                onClick={() => setStep(0)}
                disabled={isSubmitting}
              >
                Back to Edit Terms
              </Button>
              <Button
                onClick={handleConfirmRenewal}
                disabled={isSubmitting}
                className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Renewal...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Confirm & Create Renewal
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
