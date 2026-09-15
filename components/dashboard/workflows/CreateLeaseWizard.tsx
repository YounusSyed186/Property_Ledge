'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, UserPlus, Building, Calendar, DollarSign, Sparkles, Search, Mail } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchAllWorkspaceTenants,
  fetchDashboardProperties,
  handleCreateLease,
  handleCreateTenant,
} from '@/app/actions/dashboard';
import { sendLeaseAgreementTestEmailAction } from '@/app/actions/automations';
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

const STEPS = [
  { id: 1, name: 'Parties' },
  { id: 2, name: 'Terms' },
  { id: 3, name: 'Financials' },
  { id: 4, name: 'Review' },
];

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
  const [rentFrequency, setRentFrequency] = useState('weekly');
  const [status, setStatus] = useState<'active' | 'draft' | 'pending'>('active');
  const [notes, setNotes] = useState('');

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

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
        setRentFrequency(initialData.rentFrequency || 'weekly');
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
        setRentFrequency('weekly');
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
    setIsSaving(true);
    setValidationError(null);

    try {
      let tenantIdToLink = selectedTenantId;

      if (tenantMode === 'new') {
        const createTenantRes: any = await handleCreateTenant(targetPropertyId, {
          first_name: newTenant.firstName.trim(),
          last_name: newTenant.lastName.trim(),
          email: newTenant.email.trim().toLowerCase(),
          phone: newTenant.phone.trim() || null,
          status: 'active',
        });
        if (!createTenantRes.success || !createTenantRes.data?.id) {
          throw new Error('Failed to create new tenant profile.');
        }
        tenantIdToLink = createTenantRes.data.id;
      }

      const leasePayload: any = {
        property_id: targetPropertyId,
        start_date: startDate,
        end_date: isPeriodic ? null : endDate || null,
        rent_amount: Number(rentAmount),
        rent_frequency: rentFrequency as any,
        security_deposit: securityDeposit ? Number(securityDeposit) : undefined,
        payment_due_day: parseInt(paymentDueDay, 10) || 1,
        status,
        terms_and_conditions: notes.trim() || null,
      };

      const res: any = await handleCreateLease(targetPropertyId, leasePayload, tenantIdToLink ? [tenantIdToLink] : []);

      if (!res.success) {
        throw new Error(res.error || 'Failed to create lease.');
      }

      success('Lease Created', 'The lease agreement has been recorded.');
      setShowNextActions(true);
    } catch (err: any) {
      console.error('Error in CreateLeaseWizard:', err);
      setValidationError(err.message || 'Could not create lease. Please check all fields and try again.');
      showError('Lease creation failed', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setTestSuccess(null);
    setValidationError(null);
    try {
      const tenantName =
        tenantMode === 'new'
          ? `${newTenant.firstName} ${newTenant.lastName}`.trim() || 'Tenant'
          : `${selectedTenantObj?.first_name || ''} ${selectedTenantObj?.last_name || ''}`.trim() || 'Tenant';

      const tenantEmail = tenantMode === 'new' ? newTenant.email : selectedTenantObj?.email;

      const res = await sendLeaseAgreementTestEmailAction({
        testRecipient,
        propertyId: targetPropertyId,
        propertyName: activeProp?.name || 'Property',
        propertyAddress: activeProp?.address_line_1,
        tenantName,
        tenantEmail,
        tenantPhone: tenantMode === 'new' ? newTenant.phone : selectedTenantObj?.phone || undefined,
        startDate,
        endDate: isPeriodic ? null : endDate,
        rentAmount: Number(rentAmount) || 0,
        rentFrequency,
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        notes,
      });

      if (!res.success) throw new Error(res.error || 'Failed to send test email');
      setTestSuccess(`Test agreement email sent to ${res.recipient || testRecipient || 'your inbox'}!`);
      success('Test Email Sent', `Agreement preview delivered to ${res.recipient || testRecipient || 'your inbox'}.`);
      setTimeout(() => setTestSuccess(null), 5000);
    } catch (err: any) {
      console.error('Test email error:', err);
      showError('Test Email Failed', err.message || 'Could not send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const nextActions: NextAction[] = [
    {
      label: 'View Lease Management',
      href: '/dashboard/leases',
    },
    {
      label: 'Back to Property Hub',
      href: targetPropertyId ? `/dashboard/properties/${targetPropertyId}` : '/dashboard/properties',
    },
  ];

  if (!isOpen) return null;

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

        {/* Modal Dialog Card */}
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
              {initialData ? 'Renew / Create Lease' : 'Create Lease Agreement'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Define lease terms, assign residents, and set financial covenants.
            </p>
          </div>

          {/* Centered Stepper */}
          <nav aria-label="Progress" className="mb-6">
            <div className="flex items-center justify-center max-w-md mx-auto relative">
              {/* Connecting line track */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-[#008F83] -z-0 transition-all duration-300"
                style={{
                  width: step === 0 ? '0%' : step === 1 ? '33.3%' : step === 2 ? '66.6%' : 'calc(100% - 48px)',
                }}
              />

              <div className="w-full flex items-center justify-between z-10 px-1">
                {STEPS.map((s, idx) => {
                  const isCurrent = idx === step;
                  const isCompleted = idx < step;

                  return (
                    <div key={s.id} className="flex flex-col items-center group">
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
                        {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : s.id}
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
                        {s.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Error Alert */}
          {validationError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
              {validationError}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-[300px] px-0.5 py-1">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step-parties"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {/* Target Property */}
                  <div>
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
                      className="bg-white dark:bg-slate-800"
                      options={[
                        { value: '', label: '-- Select Property --' },
                        ...properties.map((p) => ({
                          value: p.id,
                          label: `${p.name || p.address_line_1} (${p.city || 'Property'})`,
                        })),
                      ]}
                    />
                  </div>

                  {/* Tenant Mode Segmented Buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Resident Assignment
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTenantMode('select')}
                        className={cn(
                          'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border',
                          tenantMode === 'select'
                            ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                        )}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setTenantMode('new')}
                        className={cn(
                          'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border',
                          tenantMode === 'new'
                            ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                        )}
                      >
                        + New Resident
                      </button>
                    </div>

                    {tenantMode === 'select' ? (
                      <div className="space-y-2 pt-2">
                        {tenants.length > 4 && (
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search residents by name or email..."
                              value={tenantSearch}
                              onChange={(e) => setTenantSearch(e.target.value)}
                              className="w-full pl-9 pr-3 h-10 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#008F83]"
                            />
                          </div>
                        )}

                        {isLoading ? (
                          <div className="flex justify-center py-6">
                            <div className="w-6 h-6 border-2 border-[#008F83] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : filteredTenants.length > 0 ? (
                          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                            {filteredTenants.map((t) => {
                              const isSelected = selectedTenantId === t.id;
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTenantId(t.id)}
                                  className={cn(
                                    'flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all',
                                    isSelected
                                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-1 ring-[#008F83]'
                                      : 'border-slate-200 dark:border-slate-800 hover:border-[#008F83]/40 bg-white dark:bg-slate-800/40'
                                  )}
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {t.first_name} {t.last_name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {t.email}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-[#008F83] text-white flex items-center justify-center shrink-0">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                            No resident found. Click "+ New Resident" above to add.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 pt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="First Name *"
                            value={newTenant.firstName}
                            onChange={(e) => setNewTenant({ ...newTenant, firstName: e.target.value })}
                            placeholder="e.g. Michael"
                            className="bg-white dark:bg-slate-800"
                          />
                          <Input
                            label="Last Name"
                            value={newTenant.lastName}
                            onChange={(e) => setNewTenant({ ...newTenant, lastName: e.target.value })}
                            placeholder="e.g. Scott"
                            className="bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Email Address *"
                            type="email"
                            value={newTenant.email}
                            onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                            placeholder="e.g. michael@example.com"
                            className="bg-white dark:bg-slate-800"
                          />
                          <Input
                            label="Phone"
                            type="tel"
                            value={newTenant.phone}
                            onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                            placeholder="e.g. 0400 000 000"
                            className="bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step-terms"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Lease Type
                    </label>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <Input
                      label="Start Date *"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white dark:bg-slate-800"
                    />
                    {!isPeriodic ? (
                      <Input
                        label="End Date *"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white dark:bg-slate-800"
                      />
                    ) : (
                      <div className="flex flex-col justify-center px-1">
                        <span className="text-[11px] font-medium text-slate-400">Duration</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ongoing monthly agreement</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-financials"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Rent Amount ($) *"
                      type="number"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="e.g. 600"
                      className="bg-white dark:bg-slate-800"
                    />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Bond / Deposit ($)"
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="e.g. 2400"
                      className="bg-white dark:bg-slate-800"
                    />
                    <Select
                      label="Initial Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="bg-white dark:bg-slate-800"
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'pending', label: 'Pending' },
                      ]}
                    />
                  </div>

                  <div>
                    <Textarea
                      label="Special Terms / Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional covenants or internal notes..."
                      rows={3}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </motion.div>
              )}

              {step === 3 && (
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
                        <Sparkles className="w-3.5 h-3.5" /> Lease Overview
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#008F83]/10 text-[#008F83]">
                        Ready to Create
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Property</span>
                        <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                          {activeProp?.name || activeProp?.address_line_1 || 'Selected Property'}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Resident</span>
                        <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                          {tenantMode === 'new'
                            ? `${newTenant.firstName} ${newTenant.lastName}`
                            : `${selectedTenantObj?.first_name || ''} ${selectedTenantObj?.last_name || ''}`}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration</span>
                        <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                          {startDate} → {isPeriodic ? 'Periodic' : endDate}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Rent & Frequency</span>
                        <span className="font-bold text-[#008F83] mt-0.5 block truncate">
                          ${Number(rentAmount).toLocaleString()} / {rentFrequency}
                        </span>
                      </div>
                    </div>

                    {/* Test Email Verification Box */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#008F83]" />
                          Send Test Email & Lease PDF Preview
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Sandbox
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Receive a sample copy of the official agreement PDF summary in your inbox before saving.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="email"
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                          placeholder="Your test email (defaults to your profile email)"
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008F83]"
                        />
                        <button
                          type="button"
                          onClick={handleSendTestEmail}
                          disabled={isSendingTest || isSaving}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#008F83]/10 hover:bg-[#008F83]/20 text-[#008F83] border border-[#008F83]/30 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {isSendingTest ? 'Sending...' : 'Send Test Email'}
                        </button>
                      </div>
                      {testSuccess && (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                          <Check className="w-3.5 h-3.5" /> {testSuccess}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-200 dark:border-slate-800">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              className="h-11 px-6 rounded-xl font-semibold text-xs sm:text-sm bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px]"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : step === STEPS.length - 1 ? (
                'Create Lease'
              ) : (
                'Continue'
              )}
            </button>
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
