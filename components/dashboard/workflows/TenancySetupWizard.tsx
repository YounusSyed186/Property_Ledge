'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, User, Plus, Pencil, Trash2, Calendar, DollarSign, Sparkles, Building2 } from 'lucide-react';
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

const STEPS = [
  { id: 1, name: 'Tenants' },
  { id: 2, name: 'Lease & Bond' },
  { id: 3, name: 'Review' },
];

export function TenancySetupWizard({
  isOpen,
  onClose,
  propertyId,
  propertyAddress,
  propertyName,
  defaultRentAmount = 0,
  onSuccess,
}: TenancySetupWizardProps) {
  const { success, error: showError } = useToast();
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
    rentFrequency: 'Weekly' as 'Weekly' | 'Fortnightly' | 'Monthly' | 'Yearly',
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
        rentFrequency: 'Weekly',
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
    const updated = tenants.filter((t) => t.id !== id);
    setTenants(updated);
    if (updated.length === 0) {
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
          rentFrequency: leaseDetails.rentFrequency.toLowerCase() as any,
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Card */}
        <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl z-10 p-6 sm:p-8">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Centered Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
              Setup Tenancy
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {propertyName || propertyAddress ? `For ${propertyName || propertyAddress}` : 'Register lease terms and residents.'}
            </p>
          </div>

          {/* Centered Stepper */}
          <nav aria-label="Progress" className="mb-6">
            <div className="flex items-center justify-center max-w-md mx-auto relative">
              {/* Connecting line track */}
              <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
              <div
                className="absolute top-4 left-8 h-0.5 bg-[#008F83] -z-0 transition-all duration-300"
                style={{
                  width: activeStep === 0 ? '0%' : activeStep === 1 ? '50%' : 'calc(100% - 64px)',
                }}
              />

              <div className="w-full flex items-center justify-between z-10 px-2">
                {STEPS.map((step, idx) => {
                  const isCurrent = idx === activeStep;
                  const isCompleted = idx < activeStep;

                  return (
                    <div key={step.id} className="flex flex-col items-center group">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                          isCurrent
                            ? 'bg-[#008F83] text-white shadow-md ring-4 ring-[#008F83]/15 scale-105'
                            : isCompleted
                            ? 'bg-[#008F83] text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.id}
                      </div>
                      <span
                        className={cn(
                          'mt-1.5 text-[11px] font-medium transition-colors',
                          isCurrent
                            ? 'text-[#008F83] font-semibold'
                            : isCompleted
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-500'
                        )}
                      >
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Error Alert */}
          {submitError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
              {submitError}
            </div>
          )}

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto min-h-[320px] px-0.5 py-1">
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="step-tenants"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {/* Existing added tenants list */}
                  {tenants.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Registered Residents ({tenants.length})
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden">
                        {tenants.map((t, idx) => (
                          <div key={t.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#008F83]/10 text-[#008F83] flex items-center justify-center font-bold text-xs shrink-0">
                                {t.firstName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                  {t.firstName} {t.lastName}
                                  {idx === 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#008F83]/10 text-[#008F83]">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {t.email} {t.phone && `· ${t.phone}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditTenant(t)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit resident"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTenant(t.id)}
                                className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                title="Remove resident"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add / Edit Form */}
                  {isAdding ? (
                    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#008F83]" />
                          {editingId ? 'Edit Resident Details' : 'Resident Information'}
                        </span>
                        {tenants.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdding(false);
                              setEditingId(null);
                              setTenantForm({ firstName: '', lastName: '', email: '', phone: '' });
                            }}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="First Name *"
                          value={tenantForm.firstName}
                          onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                          placeholder="e.g. John"
                          className="bg-white dark:bg-slate-800"
                        />
                        <Input
                          label="Last Name"
                          value={tenantForm.lastName}
                          onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                          placeholder="e.g. Smith"
                          className="bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Email Address *"
                          type="email"
                          value={tenantForm.email}
                          onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                          placeholder="e.g. john.smith@example.com"
                          className="bg-white dark:bg-slate-800"
                        />
                        <Input
                          label="Phone Number"
                          type="tel"
                          value={tenantForm.phone}
                          onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                          placeholder="e.g. 0412 345 678"
                          className="bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleSaveTenant}
                          disabled={!tenantForm.firstName.trim() || !tenantForm.email.trim()}
                          className="h-10 px-4 rounded-xl font-semibold text-xs bg-[#008F83] hover:bg-[#007A70] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {editingId ? 'Save Changes' : 'Save Resident'}
                        </button>
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
                      className="w-full py-3.5 px-4 border border-dashed border-slate-200 dark:border-slate-700 hover:border-[#008F83] rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#008F83] transition-all flex items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/20 dark:hover:bg-slate-800/40"
                    >
                      <Plus className="w-4 h-4" /> Add another tenant (Co-tenant)
                    </button>
                  )}
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="step-lease"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  {/* Lease Type Segmented Buttons */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Lease Agreement Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLeaseDetails((prev) => ({ ...prev, leaseType: 'Fixed Term' }))}
                        className={cn(
                          'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border',
                          leaseDetails.leaseType === 'Fixed Term'
                            ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                        )}
                      >
                        Fixed Term
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaseDetails((prev) => ({ ...prev, leaseType: 'Periodic' }))}
                        className={cn(
                          'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border',
                          leaseDetails.leaseType === 'Periodic'
                            ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                        )}
                      >
                        Periodic (Month-to-Month)
                      </button>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Start Date *"
                      type="date"
                      value={leaseDetails.startDate}
                      onChange={(e) => setLeaseDetails({ ...leaseDetails, startDate: e.target.value })}
                      className="bg-white dark:bg-slate-800"
                    />
                    {leaseDetails.leaseType === 'Fixed Term' ? (
                      <Input
                        label="End Date *"
                        type="date"
                        value={leaseDetails.endDate}
                        onChange={(e) => setLeaseDetails({ ...leaseDetails, endDate: e.target.value })}
                        className="bg-white dark:bg-slate-800"
                      />
                    ) : (
                      <div className="flex flex-col justify-center px-1">
                        <span className="text-[11px] font-medium text-slate-400">Duration</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ongoing month-to-month tenancy</p>
                      </div>
                    )}
                  </div>

                  {/* Rent & Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <Input
                      label="Rent Amount ($) *"
                      type="number"
                      value={leaseDetails.rentAmount}
                      onChange={(e) => setLeaseDetails({ ...leaseDetails, rentAmount: e.target.value })}
                      placeholder="e.g. 650"
                      className="bg-white dark:bg-slate-800"
                    />
                    <Select
                      label="Payment Frequency"
                      value={leaseDetails.rentFrequency}
                      onChange={(e) => setLeaseDetails({ ...leaseDetails, rentFrequency: e.target.value as any })}
                      className="bg-white dark:bg-slate-800"
                      options={[
                        { value: 'Weekly', label: 'Weekly' },
                        { value: 'Fortnightly', label: 'Fortnightly' },
                        { value: 'Monthly', label: 'Monthly' },
                        { value: 'Yearly', label: 'Yearly' },
                      ]}
                    />
                  </div>

                  {/* Bond Amount & Paid Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <Input
                      label="Bond / Security Deposit ($)"
                      type="number"
                      value={bondDetails.amount}
                      onChange={(e) => setBondDetails({ ...bondDetails, amount: e.target.value })}
                      placeholder="e.g. 2600"
                      className="bg-white dark:bg-slate-800"
                    />
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2.5 cursor-pointer pt-4">
                        <input
                          type="checkbox"
                          checked={bondDetails.isPaid}
                          onChange={(e) => setBondDetails({ ...bondDetails, isPaid: e.target.checked })}
                          className="rounded-md border-slate-300 dark:border-slate-700 text-[#008F83] focus:ring-[#008F83] h-4 w-4"
                        />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Bond received in full
                        </span>
                      </label>
                    </div>
                  </div>

                  {!bondDetails.isPaid && bondDetails.amount && Number(bondDetails.amount) > 0 && (
                    <div>
                      <Input
                        label="Bond Due Date"
                        type="date"
                        value={bondDetails.dueDate}
                        onChange={(e) => setBondDetails({ ...bondDetails, dueDate: e.target.value })}
                        className="bg-white dark:bg-slate-800"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="step-review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#008F83] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Tenancy Summary
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#008F83]/10 text-[#008F83]">
                        Ready to Register
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Property */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Property</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                          {propertyName || propertyAddress || 'Selected Property'}
                        </div>
                        {propertyAddress && propertyName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {propertyAddress}
                          </div>
                        )}
                      </div>

                      {/* Residents */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Residents ({tenants.length})
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                          {tenants.map((t) => `${t.firstName} ${t.lastName}`.trim()).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tenants[0]?.email}
                        </div>
                      </div>

                      {/* Lease Term */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Lease Term</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                          {leaseDetails.startDate} → {leaseDetails.leaseType === 'Fixed Term' ? leaseDetails.endDate : 'Periodic'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {leaseDetails.leaseType}
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Rent & Security Bond</div>
                        <div className="font-bold text-[#008F83] mt-0.5 truncate">
                          ${Number(leaseDetails.rentAmount).toLocaleString()} / {leaseDetails.rentFrequency.toLowerCase()}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Bond: ${Number(bondDetails.amount || 0).toLocaleString()} ({bondDetails.isPaid ? 'Paid' : 'Pending'})
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center px-2">
                    Upon confirmation, the digital lease and resident profile(s) will be linked to this property.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-200 dark:border-slate-800">
            {activeStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-semibold text-xs sm:text-sm bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : activeStep === STEPS.length - 1 ? (
                'Confirm & Setup'
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDone} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-2xl z-10 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#008F83]/10 text-[#008F83] flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tenancy Registered!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                The lease agreement and resident accounts are now active.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDone}
              className="w-full h-11 rounded-xl font-semibold text-xs sm:text-sm bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs transition-all"
            >
              View Tenancy
            </button>
          </div>
        </div>
      )}
    </>
  );
}
