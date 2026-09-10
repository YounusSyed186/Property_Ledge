'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, UserPlus, Check, Building, Calendar, DollarSign, Sparkles, Search } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchAllWorkspaceTenants,
  fetchDashboardProperties,
  handleCreateLease,
  handleCreateTenant,
} from '@/app/actions/dashboard';
import { NextActionDialog, type NextAction } from '@/components/dashboard/NextActionDialog';
import { getAuTodayString } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface CreateLeaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  propertyId?: string;
  propertyName?: string;
  preselectedTenantId?: string;
  preselectedUnitId?: string;
  initialData?: {
    propertyId?: string;
    startDate?: string;
    endDate?: string;
    isPeriodic?: boolean;
    rentAmount?: number;
    rentFrequency?: string;
    securityDeposit?: number;
    status?: string;
    tenants?: Array<{ firstName: string; lastName: string; email: string }>;
  } | null;
}

type TenantRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  property_id?: string;
  property?: { id: string; name: string; address_line_1: string } | null;
  lease_tenants?: Array<{
    is_primary?: boolean;
    role?: string;
    lease?: {
      id: string;
      status: string;
      start_date: string;
      end_date: string | null;
      rent_amount: number;
    } | null;
  }>;
};
type PropertyRow = { id: string; name: string; address_line_1: string; city: string; rent_amount?: number };

const STEPS = ['Property & Tenant', 'Lease Terms', 'Financials', 'Review & Confirm'];

export function CreateLeaseWizard({
  isOpen,
  onClose,
  onSuccess,
  propertyId: propIdProp,
  propertyName: propNameProp,
  preselectedTenantId,
  initialData,
}: CreateLeaseWizardProps) {
  const { selectedProperty } = usePropertyContext();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(0);

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [targetPropertyId, setTargetPropertyId] = useState<string>(propIdProp || selectedProperty?.propertyId || '');
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNextActions, setShowNextActions] = useState(false);

  // Tenant selection / inline creation
  const [tenantMode, setTenantMode] = useState<'select' | 'new'>('select');
  const [selectedTenantId, setSelectedTenantId] = useState(preselectedTenantId || '');
  const [newTenant, setNewTenant] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Terms
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);

  // Financials
  const [rentAmount, setRentAmount] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('1');
  const [rentFrequency, setRentFrequency] = useState('monthly');
  const [status, setStatus] = useState<'active' | 'draft' | 'pending'>('active');
  const [notes, setNotes] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  // Load properties and all workspace tenants on open
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    Promise.all([
      fetchDashboardProperties(),
      fetchAllWorkspaceTenants(),
    ])
      .then(([props, tenantData]) => {
        setProperties((props || []) as unknown as PropertyRow[]);
        const tenantList = (tenantData || []) as unknown as TenantRow[];
        setTenants(tenantList);
        if (preselectedTenantId) {
          const match = tenantList.find((t) => t.id === preselectedTenantId);
          if (match && !propIdProp && !selectedProperty?.propertyId && match.property_id) {
            setTargetPropertyId(match.property_id);
          }
        }
      })
      .catch((err) => {
        console.error('Error initializing lease wizard:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, preselectedTenantId, propIdProp, selectedProperty?.propertyId]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setValidationError(null);
      setTenantSearch('');
      const activePropId = propIdProp || selectedProperty?.propertyId || initialData?.propertyId || '';
      setTargetPropertyId(activePropId);
      setSelectedTenantId(preselectedTenantId || '');
      setTenantMode(preselectedTenantId ? 'select' : 'select');
      setNewTenant({ firstName: '', lastName: '', email: '', phone: '' });

      if (initialData) {
        setStartDate(initialData.startDate || getAuTodayString());
        setEndDate(initialData.endDate || '');
        setIsPeriodic(initialData.isPeriodic || !initialData.endDate);
        setRentAmount(initialData.rentAmount?.toString() || '');
        setRentFrequency(initialData.rentFrequency || 'monthly');
        setSecurityDeposit(initialData.securityDeposit?.toString() || '');
        setStatus((initialData.status as any) || 'active');
        if (initialData.tenants?.length) {
          setNewTenant({
            firstName: initialData.tenants[0].firstName || '',
            lastName: initialData.tenants[0].lastName || '',
            email: initialData.tenants[0].email || '',
            phone: '',
          });
          setTenantMode('new');
        }
      } else {
        setStartDate(getAuTodayString());
        setEndDate('');
        setIsPeriodic(false);
        setRentAmount('');
        setSecurityDeposit('');
        setPaymentDueDay('1');
        setRentFrequency('monthly');
        setStatus('active');
        setNotes('');
      }
      setShowNextActions(false);
    }
  }, [isOpen, propIdProp, selectedProperty?.propertyId, preselectedTenantId, initialData]);

  const activeProp = properties.find((p) => p.id === targetPropertyId);
  const selectedTenantObj = tenants.find((t) => t.id === selectedTenantId);

  const filteredTenants = useMemo(() => {
    let list = tenants;
    if (tenantSearch.trim()) {
      const q = tenantSearch.toLowerCase().trim();
      list = list.filter((t) =>
        `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.property?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tenants, tenantSearch]);

  const validateCurrentStep = () => {
    setValidationError(null);
    if (step === 0) {
      if (!targetPropertyId) {
        setValidationError('Please select a property.');
        return false;
      }
      if (tenantMode === 'select' && !selectedTenantId) {
        setValidationError('Please choose a tenant or switch to create a new tenant.');
        return false;
      }
      if (tenantMode === 'new') {
        if (!newTenant.firstName.trim()) {
          setValidationError('Tenant first name is required.');
          return false;
        }
        if (!newTenant.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newTenant.email)) {
          setValidationError('Valid tenant email is required.');
          return false;
        }
      }
      return true;
    }
    if (step === 1) {
      if (!startDate) {
        setValidationError('Lease start date is required.');
        return false;
      }
      if (!isPeriodic && !endDate) {
        setValidationError('End date is required for fixed term leases.');
        return false;
      }
      if (!isPeriodic && endDate && new Date(endDate) <= new Date(startDate)) {
        setValidationError('End date must be after start date.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) <= 0) {
        setValidationError('Please enter a valid positive rent amount.');
        return false;
      }
      if (securityDeposit && (isNaN(Number(securityDeposit)) || Number(securityDeposit) < 0)) {
        setValidationError('Security deposit must be a positive number.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleCreate = async () => {
    if (!targetPropertyId) return;
    setIsSaving(true);
    setValidationError(null);
    try {
      let finalTenantId = selectedTenantId;

      // Create new tenant if mode is 'new'
      if (tenantMode === 'new') {
        const tenantRes = await handleCreateTenant(targetPropertyId, {
          first_name: newTenant.firstName.trim(),
          last_name: newTenant.lastName.trim() || '',
          email: newTenant.email.trim().toLowerCase(),
          phone: newTenant.phone.trim() || null,
          status: 'active',
        });
        if (!tenantRes.success || !tenantRes.data) {
          throw new Error('Failed to create tenant profile.');
        }
        finalTenantId = (tenantRes.data as any).id;
      }

      await handleCreateLease(
        targetPropertyId,
        {
          start_date: startDate,
          end_date: (isPeriodic ? null : endDate || null) as any,
          rent_amount: Number(rentAmount),
          security_deposit: securityDeposit ? Number(securityDeposit) : 0,
          payment_due_day: Number(paymentDueDay) || 1,
          rent_frequency: rentFrequency as any,
          status: status,
          notes: notes.trim() || null,
        },
        finalTenantId ? [finalTenantId] : undefined
      );

      success('Lease Created', 'Your lease agreement has been created.');
      setShowNextActions(true);
    } catch (err: any) {
      console.error('Lease creation error:', err);
      setValidationError(err.message || 'Could not create lease.');
    } finally {
      setIsSaving(false);
    }
  };

  const nextActions: NextAction[] = [
    {
      label: 'View lease details',
      description: 'Review and manage your newly created lease',
      href: '/dashboard/leases',
    },
    {
      label: 'View tenant profile',
      description: 'Check resident status and documents',
      href: '/dashboard/tenants',
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="relative w-full max-w-2xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center font-bold text-sm">
                {step + 1}
              </div>
              <div>
                <h2 className="text-base font-black text-admin-foreground">
                  {initialData ? 'Renew / Create Lease' : 'Create Lease Agreement'}
                </h2>
                <p className="text-xs text-admin-muted">
                  {STEPS[step]} · Step {step + 1} of {STEPS.length}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-admin-muted hover:text-admin-foreground rounded-lg hover:bg-admin-surface-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-4 border-b border-admin-border bg-admin-surface-subtle text-xs font-semibold">
            {STEPS.map((label, idx) => (
              <div
                key={label}
                className={cn(
                  'py-2.5 px-3 text-center border-b-2 transition-colors truncate',
                  step === idx
                    ? 'border-admin-primary text-admin-primary font-bold bg-admin-surface'
                    : step > idx
                    ? 'border-transparent text-admin-foreground/80'
                    : 'border-transparent text-admin-muted'
                )}
              >
                <span className="hidden sm:inline">{idx + 1}. </span>{label}
              </div>
            ))}
          </div>

          {/* Error Alert */}
          {validationError && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
              {validationError}
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {step === 0 ? (
              <div className="space-y-5">
                {/* Target Property */}
                <div className="space-y-1.5">
                  <Select
                    label="Target Property *"
                    value={targetPropertyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTargetPropertyId(id);
                      const p = properties.find((prop) => prop.id === id);
                      if (p?.rent_amount) {
                        setRentAmount(p.rent_amount.toString());
                      }
                    }}
                    options={[
                      { value: '', label: '-- Select Property --' },
                      ...properties.map((p) => ({
                        value: p.id,
                        label: `${p.name || p.address_line_1} (${p.city || 'Property'})`,
                      })),
                    ]}
                  />
                </div>

                {/* Tenant mode toggle */}
                <div className="space-y-3 pt-2 border-t border-admin-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-admin-muted">Resident / Tenant</span>
                    <div className="flex gap-1 bg-admin-surface-subtle p-0.5 rounded-lg border border-admin-border">
                      <button
                        type="button"
                        onClick={() => setTenantMode('select')}
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-md transition-colors',
                          tenantMode === 'select' ? 'bg-admin-surface text-admin-foreground shadow-xs' : 'text-admin-muted hover:text-admin-foreground'
                        )}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setTenantMode('new')}
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-md transition-colors',
                          tenantMode === 'new' ? 'bg-admin-surface text-admin-foreground shadow-xs' : 'text-admin-muted hover:text-admin-foreground'
                        )}
                      >
                        + New Tenant
                      </button>
                    </div>
                  </div>

                  {tenantMode === 'select' ? (
                    <div className="space-y-2.5">
                      {tenants.length > 5 && (
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
                          <input
                            type="text"
                            placeholder="Search residents by name or email..."
                            value={tenantSearch}
                            onChange={(e) => setTenantSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-admin-surface border border-admin-border text-admin-foreground placeholder:text-admin-muted focus:outline-hidden focus:border-admin-primary"
                          />
                        </div>
                      )}

                      {isLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-6 h-6 border-2 border-admin-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredTenants.length > 0 ? (
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {filteredTenants.map((t) => {
                            const isSelected = selectedTenantId === t.id;
                            const isThisProperty = targetPropertyId && t.property_id === targetPropertyId;
                            return (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTenantId(t.id)}
                                className={cn(
                                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                                  isSelected
                                    ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground ring-1 ring-admin-primary'
                                    : 'border-admin-border hover:border-admin-primary/40 bg-admin-surface'
                                )}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-admin-foreground">
                                      {t.first_name} {t.last_name}
                                    </span>
                                    {t.lease_tenants?.some((lt) => lt.lease?.status === 'active') ? (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Active Lease
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-admin-surface-subtle text-admin-muted border border-admin-border/50">
                                        Available (No Active Lease)
                                      </span>
                                    )}
                                    {t.property?.name && (
                                      <span className="text-[10px] text-admin-muted">
                                        · {t.property.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-admin-muted">{t.email} {t.phone ? `· ${t.phone}` : ''}</div>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-admin-primary text-white flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-5 text-center border border-dashed border-admin-border rounded-xl text-xs text-admin-muted space-y-2">
                          <div>
                            {tenantSearch
                              ? `No residents matching "${tenantSearch}".`
                              : 'No residents registered in your workspace yet.'}
                          </div>
                          {tenantSearch ? (
                            <button
                              type="button"
                              onClick={() => setTenantSearch('')}
                              className="font-bold text-admin-primary hover:underline text-xs"
                            >
                              Clear search
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setTenantMode('new')}
                              className="inline-flex items-center gap-1 font-bold text-admin-primary hover:underline text-xs"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Add New Resident
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="First Name *"
                          value={newTenant.firstName}
                          onChange={(e) => setNewTenant({ ...newTenant, firstName: e.target.value })}
                          placeholder="e.g. Michael"
                        />
                        <Input
                          label="Last Name"
                          value={newTenant.lastName}
                          onChange={(e) => setNewTenant({ ...newTenant, lastName: e.target.value })}
                          placeholder="e.g. Scott"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Email Address *"
                          type="email"
                          value={newTenant.email}
                          onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                          placeholder="e.g. michael@example.com"
                        />
                        <Input
                          label="Phone"
                          type="tel"
                          value={newTenant.phone}
                          onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                          placeholder="e.g. 0400 000 000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Lease Type"
                    value={isPeriodic ? 'Periodic' : 'Fixed Term'}
                    onChange={(e) => setIsPeriodic(e.target.value === 'Periodic')}
                    options={[
                      { value: 'Fixed Term', label: 'Fixed Term' },
                      { value: 'Periodic', label: 'Periodic (Month-to-Month)' },
                    ]}
                  />
                  <Input
                    label="Start Date *"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {!isPeriodic && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="End Date *"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            ) : step === 2 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Rent Amount ($) *"
                    type="number"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    placeholder="e.g. 600"
                  />
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

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Bond / Deposit ($)"
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="e.g. 2400"
                  />
                  <Select
                    label="Initial Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'pending', label: 'Pending' },
                    ]}
                  />
                </div>

                <Textarea
                  label="Special Terms / Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional covenants or internal notes..."
                  rows={2}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-admin-surface-subtle border border-admin-border space-y-3">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-admin-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Lease Overview
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-admin-muted font-bold block">Property</span>
                      <span className="font-bold text-admin-foreground">{activeProp?.name || activeProp?.address_line_1 || 'Selected Property'}</span>
                    </div>
                    <div>
                      <span className="text-admin-muted font-bold block">Tenant</span>
                      <span className="font-bold text-admin-foreground">
                        {tenantMode === 'new'
                          ? `${newTenant.firstName} ${newTenant.lastName}`
                          : `${selectedTenantObj?.first_name || ''} ${selectedTenantObj?.last_name || ''}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-admin-muted font-bold block">Duration</span>
                      <span className="font-bold text-admin-foreground">
                        {startDate} → {isPeriodic ? 'Periodic' : endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-admin-muted font-bold block">Rent</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ${Number(rentAmount).toLocaleString()} / {rentFrequency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-admin-border shrink-0 bg-admin-surface-subtle/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={step > 0 ? handleBack : onClose}
              disabled={isSaving}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {step > 0 ? 'Back' : 'Cancel'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              disabled={isSaving}
              className="font-bold"
            >
              {isSaving ? (
                'Saving...'
              ) : step === STEPS.length - 1 ? (
                'Create Lease'
              ) : (
                <div className="flex items-center gap-1">
                  Next <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      <NextActionDialog
        isOpen={showNextActions}
        onClose={() => {
          setShowNextActions(false);
          onSuccess?.();
          onClose();
        }}
        title="Lease Created"
        description="The lease agreement is now recorded in your portfolio."
        actions={nextActions}
      />
    </>
  );
}
