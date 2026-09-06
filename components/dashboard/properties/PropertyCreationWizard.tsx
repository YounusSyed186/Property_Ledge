'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Building2 } from 'lucide-react';
import { Button, Input, Select, useToast } from '@/components/admin/ui';
import { fetchUserWorkspaces, handleCreateProperty } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';

const steps = ['Property Location', 'Features & Rent', 'Final Review'];

interface PropertyCreationWizardProps {
  workspaceId?: string;
  onCancel?: () => void;
  onSuccess?: (property?: any) => void;
}

export function PropertyCreationWizard({ workspaceId: initialWorkspaceId, onCancel, onSuccess }: PropertyCreationWizardProps) {
  const { success: showSuccess, error: showError } = useToast();
  const { refreshProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId || activeWorkspaceId || '');
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    suburb: '',
    postcode: '',
    state: '',
    propertyCategory: 'Residential' as 'Residential' | 'Commercial',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    carSpaces: '',
    rentAmount: '',
    paymentFrequency: 'Weekly',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeWorkspaceId && !workspaceId) {
      setWorkspaceId(activeWorkspaceId);
    }
  }, [activeWorkspaceId, workspaceId]);

  useEffect(() => {
    fetchUserWorkspaces().then((ws: any) => {
      setWorkspaces(ws);
      if (!initialWorkspaceId && !activeWorkspaceId && ws && ws.length > 0) {
        setWorkspaceId(ws[0].id);
      }
    });
  }, [initialWorkspaceId, activeWorkspaceId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'propertyCategory') {
        next.propertyType = '';
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
      if (!formData.address.trim()) nextErrors.address = 'Street Address is required';
      if (!formData.suburb.trim()) nextErrors.suburb = 'Suburb is required';
      if (!formData.postcode.trim()) nextErrors.postcode = 'Postcode is required';
      if (!formData.state) nextErrors.state = 'State is required';
      if (!formData.propertyType) nextErrors.propertyType = 'Property Type is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(activeStep)) {
      showError('Validation Failed', 'Please fill in all mandatory property fields.');
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4 py-2 font-sans">
            {!initialWorkspaceId && workspaces.length > 1 && (
              <Select
                label="Target Workspace *"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            )}

            <Input
              label="Property Name / Building Title (Optional)"
              name="name"
              placeholder="e.g. Sunset Heights or Oak Street Apartments"
              value={formData.name}
              onChange={handleChange}
            />

            <Input
              label="Street Address *"
              name="address"
              placeholder="e.g. 42 Wallaby Way"
              value={formData.address}
              onChange={handleChange}
              error={errors.address}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Suburb / City *"
                name="suburb"
                placeholder="e.g. Sydney"
                value={formData.suburb}
                onChange={handleChange}
                error={errors.suburb}
              />
              <Input
                label="Postcode *"
                name="postcode"
                placeholder="e.g. 2000"
                value={formData.postcode}
                onChange={handleChange}
                error={errors.postcode}
              />
            </div>

            <Select
              label="State / Territory *"
              name="state"
              value={formData.state}
              onChange={handleChange}
              error={errors.state}
            >
              <option value="">Select State/Territory...</option>
              <option value="NSW">New South Wales (NSW)</option>
              <option value="VIC">Victoria (VIC)</option>
              <option value="QLD">Queensland (QLD)</option>
              <option value="WA">Western Australia (WA)</option>
              <option value="SA">South Australia (SA)</option>
              <option value="TAS">Tasmania (TAS)</option>
              <option value="ACT">Australian Capital Territory (ACT)</option>
              <option value="NT">Northern Territory (NT)</option>
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Select
                label="Category *"
                name="propertyCategory"
                value={formData.propertyCategory}
                onChange={handleChange}
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </Select>

              <Select
                label="Property Type *"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                error={errors.propertyType}
              >
                <option value="">Select Property Type...</option>
                {formData.propertyCategory === 'Residential' ? (
                  <>
                    <option value="House">House</option>
                    <option value="Apartment/Unit">Apartment / Unit</option>
                    <option value="Townhouse">Townhouse</option>
                  </>
                ) : (
                  <>
                    <option value="Retail">Retail</option>
                    <option value="Office">Office</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Warehouse">Warehouse</option>
                  </>
                )}
              </Select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4 py-2 font-sans">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                placeholder="e.g. 3"
                value={formData.bedrooms}
                onChange={handleChange}
              />
              <Input
                label="Bathrooms"
                name="bathrooms"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 2"
                value={formData.bathrooms}
                onChange={handleChange}
              />
              <Input
                label="Car Spaces"
                name="carSpaces"
                type="number"
                min="0"
                placeholder="e.g. 1"
                value={formData.carSpaces}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Input
                label="Advertised Rent ($)"
                name="rentAmount"
                type="number"
                min="0"
                placeholder="e.g. 650"
                value={formData.rentAmount}
                onChange={handleChange}
              />

              <Select
                label="Payment Frequency"
                name="paymentFrequency"
                value={formData.paymentFrequency}
                onChange={handleChange}
              >
                <option value="Weekly">Weekly</option>
                <option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="py-2 font-sans">
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="text-card-title font-heading font-semibold text-[#008F83] flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Verify Property Overview
              </h4>

              <div className="space-y-3 text-body-sm">
                <div className="flex justify-between items-start pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-caption font-semibold text-admin-muted uppercase tracking-wider">Address</span>
                  <span className="font-semibold text-right text-admin-foreground dark:text-slate-100">
                    {formData.address}, {formData.suburb} {formData.state} {formData.postcode}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-caption font-semibold text-admin-muted uppercase tracking-wider">Type & Category</span>
                  <span className="font-semibold text-admin-foreground dark:text-slate-100">
                    {formData.propertyCategory} · {formData.propertyType}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-caption font-semibold text-admin-muted uppercase tracking-wider">Features</span>
                  <span className="font-semibold text-admin-foreground dark:text-slate-100 flex items-center gap-3">
                    <span>{formData.bedrooms || 0} Bed</span>
                    <span>{formData.bathrooms || 0} Bath</span>
                    <span>{formData.carSpaces || 0} Car</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-caption font-semibold text-admin-muted uppercase tracking-wider">Advertised Rent</span>
                  <span className="font-semibold text-[#008F83]">
                    ${formData.rentAmount || '0'} / {formData.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto font-sans antialiased">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-page-title font-heading font-semibold text-admin-foreground dark:text-slate-100">
          Add a New Property
        </h2>
        <p className="text-caption font-medium text-admin-muted mt-1">
          Initialize a physical property asset in your portfolio.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          {steps.map((label, idx) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 text-caption font-semibold transition-colors ${
                idx === activeStep
                  ? 'text-[#008F83]'
                  : idx < activeStep
                  ? 'text-slate-600 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  idx === activeStep
                    ? 'bg-[#008F83] text-white shadow-sm'
                    : idx < activeStep
                    ? 'bg-[#008F83]/20 text-[#008F83]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {idx < activeStep ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#008F83] h-full transition-all duration-300 rounded-full"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content with Motion */}
      <div className="min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent(activeStep)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions / Buttons */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="secondary"
          disabled={activeStep === 0 || isSubmitting}
          onClick={handleBack}
        >
          Previous Step
        </Button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleNext}
            className="bg-[#008F83] hover:bg-[#007a70] text-white font-bold px-6"
          >
            {isSubmitting
              ? 'Saving...'
              : activeStep === steps.length - 1
              ? 'Save Property'
              : 'Proceed to Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
