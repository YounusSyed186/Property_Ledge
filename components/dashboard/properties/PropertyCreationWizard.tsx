'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Bed, Bath, Car, Check } from 'lucide-react';
import { Input, Select, useToast } from '@/components/admin/ui';
import { fetchUserWorkspaces, handleCreateProperty } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, name: 'Location', desc: "Add the property's address and classification." },
  { id: 2, name: 'Details', desc: 'Add bedrooms, bathrooms, parking and rental information.' },
  { id: 3, name: 'Review', desc: 'Check the property details before saving.' },
];

interface PropertyCreationWizardProps {
  workspaceId?: string;
  onCancel?: () => void;
  onSuccess?: (property?: any) => void;
}

export function PropertyCreationWizard({
  workspaceId: initialWorkspaceId,
  onCancel,
  onSuccess,
}: PropertyCreationWizardProps) {
  const { success: showSuccess, error: showError } = useToast();
  const { refreshProperties } = usePropertyContext();
  const storeWorkspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId || activeWorkspaceId || (storeWorkspaces?.[0]?.id ?? ''));
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>(() => storeWorkspaces || []);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    suburb: '',
    postcode: '',
    state: 'VIC',
    propertyCategory: 'Residential' as 'Residential' | 'Commercial',
    propertyType: 'Apartment',
    bedrooms: '2',
    bathrooms: '2',
    carSpaces: '1',
    rentAmount: '650',
    paymentFrequency: 'Weekly',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeWorkspaceId && !workspaceId) {
      setWorkspaceId(activeWorkspaceId);
    }
  }, [activeWorkspaceId, workspaceId]);

  useEffect(() => {
    if (storeWorkspaces && storeWorkspaces.length > 0) {
      setWorkspaces(storeWorkspaces);
      if (!initialWorkspaceId && !activeWorkspaceId) {
        setWorkspaceId(storeWorkspaces[0].id);
      }
      return;
    }

    fetchUserWorkspaces().then((ws: any) => {
      setWorkspaces(ws || []);
      if (!initialWorkspaceId && !activeWorkspaceId && ws && ws.length > 0) {
        setWorkspaceId(ws[0].id);
      }
    });
  }, [initialWorkspaceId, activeWorkspaceId, storeWorkspaces]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'propertyCategory') {
        next.propertyType = value === 'Commercial' ? 'Office' : 'Apartment';
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.address.trim()) nextErrors.address = 'Street address is required';
      if (!formData.suburb.trim()) nextErrors.suburb = 'City or suburb is required';
      if (!formData.postcode.trim()) nextErrors.postcode = 'Postcode is required';
      if (!formData.state) nextErrors.state = 'State is required';
      if (!formData.propertyType) nextErrors.propertyType = 'Property type is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(activeStep)) {
      showError('Validation Failed', 'Please complete all required fields.');
      return;
    }

    if (activeStep === steps.length - 1) {
      if (!workspaceId) {
        showError('Workspace Required', 'Please select a workspace before creating a property.');
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          workspace_id: workspaceId,
          name: formData.name.trim() || formData.address.trim() || 'New Property',
          address_line_1: formData.address.trim(),
          city: formData.suburb.trim(),
          state: formData.state,
          postal_code: formData.postcode.trim(),
          property_category: formData.propertyCategory,
          property_type: formData.propertyType,
          bedrooms: formData.bedrooms !== '' ? Number(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms !== '' ? Number(formData.bathrooms) : 0,
          parking_spaces: formData.carSpaces !== '' ? Number(formData.carSpaces) : 0,
          rent_amount: formData.rentAmount !== '' ? Number(formData.rentAmount) : 0,
          payment_frequency: formData.paymentFrequency,
          status: 'active' as const,
        };

        const result = await handleCreateProperty(payload as any);
        showSuccess('Property Created', 'Your property has been successfully added to your portfolio.');

        try {
          await refreshProperties();
        } catch (e) {
          console.error('Error refreshing properties:', e);
        }

        if (onSuccess) {
          onSuccess(result.data);
        }
      } catch (err) {
        console.error('Error creating property:', err);
        showError('Save Failed', err instanceof Error ? err.message : 'Failed to save property. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const formatRentDisplay = () => {
    if (!formData.rentAmount) return 'Not specified';
    const freqMap: Record<string, string> = {
      Weekly: 'week',
      Fortnightly: 'fortnight',
      Monthly: 'month',
    };
    const freq = freqMap[formData.paymentFrequency] || 'week';
    return `$${Number(formData.rentAmount).toLocaleString()} / ${freq}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto font-sans text-slate-900 dark:text-slate-100">
      {/* Centered Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
          Add a new property
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add a property to your portfolio.
        </p>
      </div>

      {/* Centered Stepper */}
      <nav aria-label="Progress" className="mb-8">
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
            {steps.map((step, idx) => {
              const isCurrent = idx === activeStep;
              const isCompleted = idx < activeStep;

              return (
                <div key={step.id} className="flex flex-col items-center group">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isCurrent
                        ? 'bg-[#008F83] text-white shadow-md ring-4 ring-[#008F83]/15 scale-105'
                        : isCompleted
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.id}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-medium transition-colors ${
                      isCurrent
                        ? 'text-[#008F83] font-semibold'
                        : isCompleted
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Step Content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeStep === 0 && (
            <motion.div
              key="step-location"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 px-0.5 py-1"
            >
              {/* Target Workspace if applicable */}
              {!initialWorkspaceId && workspaces.length > 1 && (
                <div>
                  <Select
                    label="Target Workspace *"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="bg-white dark:bg-slate-800"
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Street Address */}
              <div>
                <Input
                  label="Street Address *"
                  name="address"
                  placeholder="e.g. 102 Street Road"
                  value={formData.address}
                  onChange={handleChange}
                  error={errors.address}
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              {/* Suburb & Postcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Suburb *"
                    name="suburb"
                    placeholder="e.g. Richmond"
                    value={formData.suburb}
                    onChange={handleChange}
                    error={errors.suburb}
                    className="bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Input
                    label="Postcode *"
                    name="postcode"
                    placeholder="e.g. 3121"
                    value={formData.postcode}
                    onChange={handleChange}
                    error={errors.postcode}
                    className="bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* State */}
              <div>
                <Select
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  error={errors.state}
                  className="bg-white dark:bg-slate-800"
                >
                  <option value="VIC">Victoria</option>
                  <option value="NSW">New South Wales</option>
                  <option value="QLD">Queensland</option>
                  <option value="WA">Western Australia</option>
                  <option value="SA">South Australia</option>
                  <option value="TAS">Tasmania</option>
                  <option value="ACT">Australian Capital Territory</option>
                  <option value="NT">Northern Territory</option>
                </Select>
              </div>

              {/* Segmented Category Buttons (Residential / Commercial) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      propertyCategory: 'Residential',
                      propertyType: 'Apartment',
                    }));
                  }}
                  className={cn(
                    'h-11 rounded-xl font-semibold text-sm transition-all duration-150 border',
                    formData.propertyCategory === 'Residential'
                      ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                  )}
                >
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      propertyCategory: 'Commercial',
                      propertyType: 'Office',
                    }));
                  }}
                  className={cn(
                    'h-11 rounded-xl font-semibold text-sm transition-all duration-150 border',
                    formData.propertyCategory === 'Commercial'
                      ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                  )}
                >
                  Commercial
                </button>
              </div>

              {/* Property Type & Optional Property Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Property Type"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  error={errors.propertyType}
                  className="bg-white dark:bg-slate-800"
                >
                  {formData.propertyCategory === 'Residential' ? (
                    <>
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Unit">Unit</option>
                    </>
                  ) : (
                    <>
                      <option value="Office">Office</option>
                      <option value="Retail">Retail</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Warehouse">Warehouse</option>
                    </>
                  )}
                </Select>

                <Input
                  label="Property Name (Optional)"
                  name="name"
                  placeholder="e.g. Sunset Heights"
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </motion.div>
          )}

          {activeStep === 1 && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 px-0.5 py-1"
            >
              {/* Beds, Baths, Cars */}
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Beds"
                  name="bedrooms"
                  type="number"
                  min="0"
                  placeholder="e.g. 2"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className="bg-white dark:bg-slate-800 text-center"
                />
                <Input
                  label="Baths"
                  name="bathrooms"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 2"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="bg-white dark:bg-slate-800 text-center"
                />
                <Input
                  label="Cars"
                  name="carSpaces"
                  type="number"
                  min="0"
                  placeholder="e.g. 1"
                  value={formData.carSpaces}
                  onChange={handleChange}
                  className="bg-white dark:bg-slate-800 text-center"
                />
              </div>

              {/* Advertised Rent & Payment Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Advertised Rent ($)"
                  name="rentAmount"
                  type="number"
                  min="0"
                  placeholder="e.g. 650"
                  value={formData.rentAmount}
                  onChange={handleChange}
                  leftIcon={<span className="text-xs font-bold">$</span>}
                  className="bg-white dark:bg-slate-800"
                />

                <Select
                  label="Payment Frequency"
                  name="paymentFrequency"
                  value={formData.paymentFrequency}
                  onChange={handleChange}
                  className="bg-white dark:bg-slate-800"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                </Select>
              </div>
            </motion.div>
          )}

          {activeStep === 2 && (
            <motion.div
              key="step-review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 px-0.5 py-1"
            >
              {/* Review Summary Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 p-5 sm:p-6 space-y-5 shadow-xs">
                {/* Header / Identity */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#008F83]">
                      Property Overview
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {formData.name.trim() || 'Unnamed property'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      {formData.address}
                      {formData.suburb && `, ${formData.suburb}`}
                      {formData.state && ` ${formData.state}`}
                      {formData.postcode && ` ${formData.postcode}`}
                    </p>
                  </div>
                  <div className="shrink-0 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <Building2 className="h-5 w-5 text-[#008F83]" />
                  </div>
                </div>

                {/* Category & Type Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <span>{formData.propertyCategory}</span>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span>{formData.propertyType || 'Standard'}</span>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200/80 dark:bg-slate-800" />

                {/* Property Statistics Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0 hidden sm:block">
                      <Bed className="h-4 w-4 text-[#008F83]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Bedrooms</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        {formData.bedrooms || '0'} {Number(formData.bedrooms) === 1 ? 'Bed' : 'Beds'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0 hidden sm:block">
                      <Bath className="h-4 w-4 text-[#008F83]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Bathrooms</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        {formData.bathrooms || '0'} {Number(formData.bathrooms) === 1 ? 'Bath' : 'Baths'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0 hidden sm:block">
                      <Car className="h-4 w-4 text-[#008F83]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Parking</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        {formData.carSpaces || '0'} {Number(formData.carSpaces) === 1 ? 'Space' : 'Spaces'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200/80 dark:bg-slate-800" />

                {/* Rent Row */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formData.paymentFrequency} rent
                    </span>
                    <div className="text-base sm:text-lg font-bold text-[#008F83]">
                      {formatRentDisplay()}
                    </div>
                  </div>
                  {formData.rentAmount && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                      Paid {formData.paymentFrequency.toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 mt-6 pt-2">
        {activeStep === 0 ? (
          onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
            >
              Cancel
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
          >
            Back
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99]"
        >
          {isSubmitting
            ? 'Saving property...'
            : activeStep === steps.length - 1
            ? 'Save property'
            : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
