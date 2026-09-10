'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, User, Plus, Pencil, Trash2, Calendar, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { Button, Input, Select, useToast } from '@/components/admin/ui';
import { handleSetupTenancy } from '@/app/actions/dashboard';
import { getAuTodayString } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

export interface TenancySetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyAddress?: string;
  propertyName?: string;
  defaultRentAmount?: number;
  onSuccess?: () => void;
}

interface TenantInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const STEPS = ['Tenant Details', 'Lease & Bond', 'Review & Confirm'];

export function TenancySetupWizard({
  isOpen,
  onClose,
  propertyId,
  propertyAddress,
  propertyName,
  defaultRentAmount = 0,
  onSuccess,
}: TenancySetupWizardProps) {
  const { success } = useToast();
  const [activeStep, setActiveStep] = useState(0);

  // Tenants list state
  const [tenants, setTenants] = useState<TenantInput[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Single tenant input form
  const [tenantForm, setTenantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Lease state
  const [leaseDetails, setLeaseDetails] = useState({
    startDate: '',
    endDate: '',
    leaseType: 'Fixed Term',
    rentAmount: defaultRentAmount > 0 ? defaultRentAmount.toString() : '',
    rentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly' | 'yearly',
  });

  // Bond state
  const [bondDetails, setBondDetails] = useState({
    amount: '',
    isPaid: false,
    dueDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
      setTenants([]);
      setIsAdding(true);
      setEditingId(null);
      setTenantForm({ firstName: '', lastName: '', email: '', phone: '' });
      setLeaseDetails({
        startDate: getAuTodayString(),
        endDate: '',
        leaseType: 'Fixed Term',
        rentAmount: defaultRentAmount > 0 ? defaultRentAmount.toString() : '',
        rentFrequency: 'monthly',
      });
      setBondDetails({
        amount: defaultRentAmount > 0 ? (defaultRentAmount * 4).toString() : '',
        isPaid: false,
        dueDate: getAuTodayString(),
      });
      setSubmitError(null);
      setShowSuccessPopup(false);
    }
  }, [isOpen, defaultRentAmount]);

  if (!isOpen) return null;

  const handleSaveTenant = () => {
    if (!tenantForm.firstName.trim() || !tenantForm.email.trim()) {
      setSubmitError('First name and email are required for each tenant.');
      return;
    }
    setSubmitError(null);

    if (editingId) {
      setTenants(tenants.map((t) => (t.id === editingId ? { ...t, ...tenantForm } : t)));
    } else {
      setTenants([
        ...tenants,
        {
          id: crypto.randomUUID(),
          ...tenantForm,
        },
      ]);
    }
    setTenantForm({ firstName: '', lastName: '', email: '', phone: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditTenant = (t: TenantInput) => {
    setTenantForm({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
    });
    setEditingId(t.id);
    setIsAdding(true);
  };

  const handleDeleteTenant = (id: string) => {
    setTenants(tenants.filter((t) => t.id !== id));
    if (tenants.length <= 1) {
      setIsAdding(true);
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    setSubmitError(null);
    if (stepIndex === 0) {
      if (tenants.length === 0) {
        if (tenantForm.firstName.trim() && tenantForm.email.trim()) {
          // Auto-save active tenant
          setTenants([
            {
              id: crypto.randomUUID(),
              ...tenantForm,
            },
          ]);
          setIsAdding(false);
          return true;
        }
        setSubmitError('Please add and save at least one tenant.');
        return false;
      }
      return true;
    }
    if (stepIndex === 1) {
      if (!leaseDetails.startDate) {
        setSubmitError('Please select a lease start date.');
        return false;
      }
      if (leaseDetails.leaseType === 'Fixed Term' && !leaseDetails.endDate) {
        setSubmitError('Fixed Term lease requires an end date.');
        return false;
      }
      if (leaseDetails.leaseType === 'Fixed Term' && leaseDetails.endDate <= leaseDetails.startDate) {
        setSubmitError('Lease end date must be after the start date.');
        return false;
      }
      if (!leaseDetails.rentAmount || Number(leaseDetails.rentAmount) <= 0) {
        setSubmitError('Please specify a valid rent amount.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload = {
        tenants: tenants.map((t) => ({
          firstName: t.firstName.trim(),
          lastName: t.lastName.trim(),
          email: t.email.trim().toLowerCase(),
          phone: t.phone.trim() || undefined,
        })),
        lease: {
          startDate: leaseDetails.startDate,
          endDate: leaseDetails.leaseType === 'Fixed Term' ? leaseDetails.endDate : null,
          leaseType: leaseDetails.leaseType,
          rentAmount: Number(leaseDetails.rentAmount) || 0,
          rentFrequency: leaseDetails.rentFrequency,
          securityDeposit: Number(bondDetails.amount) || 0,
          status: 'active' as const,
        },
        bond: {
          amount: Number(bondDetails.amount) || 0,
          isPaid: bondDetails.isPaid,
          dueDate: bondDetails.dueDate || null,
        },
      };

      const result = await handleSetupTenancy(propertyId, payload);
      if (!result.success) throw new Error('Failed to setup tenancy.');

      success('Tenancy Created', 'The lease and tenant(s) have been successfully registered.');
      setShowSuccessPopup(true);
    } catch (err: any) {
      console.error('Error setting up tenancy:', err);
      setSubmitError(err.message || 'An error occurred while creating tenancy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setShowSuccessPopup(false);
    onSuccess?.();
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="space-y-5">
            {/* Existing added tenants */}
            {tenants.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-admin-muted">Registered Tenants ({tenants.length})</div>
                <div className="divide-y divide-admin-border rounded-xl border border-admin-border bg-admin-surface-subtle overflow-hidden">
                  {tenants.map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between p-3.5 hover:bg-admin-surface transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-admin-primary/10 text-admin-primary flex items-center justify-center font-bold text-xs">
                          {t.firstName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-admin-foreground flex items-center gap-2">
                            {t.firstName} {t.lastName}
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-admin-primary/10 text-admin-primary">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-admin-muted">
                            {t.email} {t.phone && `· ${t.phone}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditTenant(t)}
                          className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface rounded-lg transition-colors"
                          title="Edit tenant"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTenant(t.id)}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove tenant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form for adding/editing tenant */}
            {isAdding ? (
              <div className="p-4 rounded-xl border border-admin-border bg-admin-surface space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-admin-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-admin-primary" /> {editingId ? 'Edit Tenant' : 'Tenant Information'}
                  </span>
                  {tenants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingId(null);
                        setTenantForm({ firstName: '', lastName: '', email: '', phone: '' });
                      }}
                      className="text-xs text-admin-muted hover:text-admin-foreground font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="First Name *"
                    value={tenantForm.firstName}
                    onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                    placeholder="e.g. John"
                  />
                  <Input
                    label="Last Name"
                    value={tenantForm.lastName}
                    onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                    placeholder="e.g. Smith"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Email Address *"
                    type="email"
                    value={tenantForm.email}
                    onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                    placeholder="e.g. john.smith@example.com"
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={tenantForm.phone}
                    onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                    placeholder="e.g. 0412 345 678"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={handleSaveTenant}
                    disabled={!tenantForm.firstName.trim() || !tenantForm.email.trim()}
                  >
                    {editingId ? 'Save Changes' : 'Save Tenant Details'}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTenantForm({ firstName: '', lastName: '', email: '', phone: '' });
                  setEditingId(null);
                  setIsAdding(true);
                }}
                className="w-full py-3.5 px-4 border border-dashed border-admin-border hover:border-admin-primary rounded-xl text-xs font-bold text-admin-muted hover:text-admin-primary transition-all flex items-center justify-center gap-2 bg-admin-surface-subtle/50 hover:bg-admin-surface-subtle"
              >
                <Plus className="w-4 h-4" /> Add another tenant (Co-tenant)
              </button>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Lease terms */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-admin-primary" /> Lease Agreement Terms
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Lease Type"
                  value={leaseDetails.leaseType}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, leaseType: e.target.value })}
                  options={[
                    { value: 'Fixed Term', label: 'Fixed Term' },
                    { value: 'Periodic', label: 'Periodic (Month-to-Month)' },
                  ]}
                />
                <Input
                  label="Start Date *"
                  type="date"
                  value={leaseDetails.startDate}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, startDate: e.target.value })}
                />
              </div>

              {leaseDetails.leaseType === 'Fixed Term' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="End Date *"
                    type="date"
                    value={leaseDetails.endDate}
                    onChange={(e) => setLeaseDetails({ ...leaseDetails, endDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Financial Details */}
            <div className="space-y-3 pt-2 border-t border-admin-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Rent & Financials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Rent Amount ($) *"
                  type="number"
                  value={leaseDetails.rentAmount}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, rentAmount: e.target.value })}
                  placeholder="e.g. 650"
                />
                <Select
                  label="Payment Frequency"
                  value={leaseDetails.rentFrequency}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, rentFrequency: e.target.value as any })}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'fortnightly', label: 'Fortnightly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Input
                  label="Bond / Security Deposit ($)"
                  type="number"
                  value={bondDetails.amount}
                  onChange={(e) => setBondDetails({ ...bondDetails, amount: e.target.value })}
                  placeholder="e.g. 2600"
                />
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer pt-3">
                    <input
                      type="checkbox"
                      checked={bondDetails.isPaid}
                      onChange={(e) => setBondDetails({ ...bondDetails, isPaid: e.target.checked })}
                      className="rounded border-admin-border text-admin-primary focus:ring-admin-primary h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-admin-foreground">Bond has been received in full</span>
                  </label>
                </div>
              </div>

              {!bondDetails.isPaid && bondDetails.amount && Number(bondDetails.amount) > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Bond Due Date"
                    type="date"
                    value={bondDetails.dueDate}
                    onChange={(e) => setBondDetails({ ...bondDetails, dueDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-admin-surface-subtle border border-admin-border space-y-3.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-admin-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Tenancy Summary
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-admin-surface rounded-xl border border-admin-border">
                  <div className="text-[11px] font-bold text-admin-muted uppercase">Property</div>
                  <div className="font-bold text-admin-foreground mt-0.5">{propertyName || propertyAddress || 'Selected Property'}</div>
                  {propertyAddress && propertyName && (
                    <div className="text-xs text-admin-muted">{propertyAddress}</div>
                  )}
                </div>

                <div className="p-3 bg-admin-surface rounded-xl border border-admin-border">
                  <div className="text-[11px] font-bold text-admin-muted uppercase">Tenants ({tenants.length})</div>
                  <div className="font-bold text-admin-foreground mt-0.5">
                    {tenants.map((t) => `${t.firstName} ${t.lastName}`.trim()).join(', ')}
                  </div>
                  <div className="text-xs text-admin-muted truncate">{tenants[0]?.email}</div>
                </div>

                <div className="p-3 bg-admin-surface rounded-xl border border-admin-border">
                  <div className="text-[11px] font-bold text-admin-muted uppercase">Lease Term</div>
                  <div className="font-bold text-admin-foreground mt-0.5">
                    {leaseDetails.startDate} → {leaseDetails.leaseType === 'Fixed Term' ? leaseDetails.endDate : 'Periodic'}
                  </div>
                  <div className="text-xs text-admin-muted">{leaseDetails.leaseType}</div>
                </div>

                <div className="p-3 bg-admin-surface rounded-xl border border-admin-border">
                  <div className="text-[11px] font-bold text-admin-muted uppercase">Rent & Bond</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ${Number(leaseDetails.rentAmount).toLocaleString()} / {leaseDetails.rentFrequency}
                  </div>
                  <div className="text-xs text-admin-muted">
                    Bond: ${Number(bondDetails.amount || 0).toLocaleString()} ({bondDetails.isPaid ? 'Paid' : 'Pending'})
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Upon clicking Setup Tenancy, the lease agreement and tenant accounts will be created in the database and linked to this property.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border shrink-0 bg-admin-surface">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-admin-primary/10 text-admin-primary">
                  Tenancy Journey
                </span>
                <span className="text-xs text-admin-muted">
                  Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep]}
                </span>
              </div>
              <h2 className="text-lg font-black text-admin-foreground tracking-tight mt-0.5">
                {propertyName || propertyAddress || 'Setup Tenancy'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-elevated transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 border-b border-admin-border shrink-0 bg-admin-surface-subtle/40">
            {STEPS.map((label, idx) => (
              <div
                key={label}
                className={cn(
                  'py-2.5 px-3 text-center text-xs font-bold transition-all border-b-2',
                  activeStep === idx
                    ? 'border-admin-primary text-admin-primary bg-admin-primary/5'
                    : activeStep > idx
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-admin-muted'
                )}
              >
                <span className="hidden sm:inline">{idx + 1}. </span>{label}
              </div>
            ))}
          </div>

          {/* Error Alert */}
          {submitError && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
              {submitError}
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-admin-border shrink-0 bg-admin-surface-subtle/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={activeStep === 0 || isSubmitting}
            >
              Previous Step
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="font-bold min-w-[130px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </div>
              ) : activeStep === STEPS.length - 1 ? (
                'Setup Tenancy'
              ) : (
                <div className="flex items-center gap-1.5">
                  Next Step <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={handleDone} />
          <div className="relative w-full max-w-sm bg-admin-surface border border-admin-border rounded-2xl p-6 text-center shadow-2xl z-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-admin-foreground">Tenancy Registered!</h3>
              <p className="text-xs text-admin-muted mt-1 font-medium">
                The lease and tenant profile(s) have been successfully attached to the property.
              </p>
            </div>
            <Button type="button" className="w-full" onClick={handleDone}>
              View Tenancy
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
