'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Input, Select, useToast, ConfirmDialog } from '@/components/admin/ui';
import { handleUpdateProperty, handleDeleteProperty, handleCreateProperty, fetchUserWorkspaces } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { cn } from '@/lib/utils';

export interface PropertyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId?: string;
  isCreate?: boolean;
  property?: {
    id: string;
    name?: string | null;
    address_line_1?: string | null;
    address?: string | null;
    suburb?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    postcode?: string | null;
    property_category?: string | null;
    property_type?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    car_spaces?: number | null;
    parking_spaces?: number | null;
    rent_amount?: number | null;
    payment_frequency?: string | null;
    status?: string | null;
    description?: string | null;
  } | null;
}

export function PropertyDrawer({
  isOpen,
  onClose,
  onSuccess,
  propertyId,
  isCreate = false,
  property,
}: PropertyDrawerProps) {
  const { success, error: showError } = useToast();
  const { refreshProperties } = usePropertyContext();

  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('VIC');
  const [postalCode, setPostalCode] = useState('');
  const [propertyCategory, setPropertyCategory] = useState<'Residential' | 'Commercial'>('Residential');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [carSpaces, setCarSpaces] = useState('1');
  const [rentAmount, setRentAmount] = useState('650');
  const [paymentFrequency, setPaymentFrequency] = useState('Weekly');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);

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
    if (isOpen) {
      if (property && !isCreate) {
        setName(property.name || '');
        setAddressLine1(property.address_line_1 || property.address || '');
        setSuburb(property.suburb || property.city || '');
        setState(property.state || 'VIC');
        setPostalCode(property.postal_code || property.postcode || '');
        setPropertyCategory((property.property_category as any) || 'Residential');
        setPropertyType(property.property_type || (property.property_category === 'Commercial' ? 'Office' : 'Apartment'));
        setBedrooms(property.bedrooms !== undefined && property.bedrooms !== null ? String(property.bedrooms) : '');
        setBathrooms(property.bathrooms !== undefined && property.bathrooms !== null ? String(property.bathrooms) : '');
        setCarSpaces(
          property.car_spaces !== undefined && property.car_spaces !== null
            ? String(property.car_spaces)
            : property.parking_spaces !== undefined && property.parking_spaces !== null
            ? String(property.parking_spaces)
            : ''
        );
        setRentAmount(property.rent_amount !== undefined && property.rent_amount !== null ? String(property.rent_amount) : '');
        setPaymentFrequency(property.payment_frequency || 'Weekly');
        setStatus(property.status || 'active');
        setDescription(property.description || '');
        setGstEnabled(Boolean((property as any)?.gst_enabled));
      } else {
        setName('');
        setAddressLine1('');
        setSuburb('');
        setState('VIC');
        setPostalCode('');
        setPropertyCategory('Residential');
        setPropertyType('Apartment');
        setBedrooms('');
        setBathrooms('');
        setCarSpaces('');
        setRentAmount('');
        setPaymentFrequency('Weekly');
        setStatus('active');
        setDescription('');
        setGstEnabled(false);
      }
      setFormErrors({});
    }
  }, [isOpen, property, isCreate]);

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!addressLine1.trim()) errors.addressLine1 = 'Street address is required.';
    if (!suburb.trim()) errors.suburb = 'Suburb is required.';
    if (!postalCode.trim()) errors.postalCode = 'Postcode is required.';
    if (!state) errors.state = 'State is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim() || addressLine1.trim() || 'Property',
        address_line_1: addressLine1.trim(),
        city: suburb.trim(),
        state,
        postal_code: postalCode.trim(),
        property_category: propertyCategory,
        property_type: propertyType,
        bedrooms: bedrooms !== '' ? Number(bedrooms) : 0,
        bathrooms: bathrooms !== '' ? Number(bathrooms) : 0,
        parking_spaces: carSpaces !== '' ? Number(carSpaces) : 0,
        rent_amount: rentAmount !== '' ? Number(rentAmount) : 0,
        payment_frequency: paymentFrequency,
        status: status as any,
        description: description.trim() || null,
        gst_enabled: gstEnabled,
      };

      if (isCreate) {
        const workspaces = (await fetchUserWorkspaces()) as Array<{ id: string }>;
        const activeWorkspaceId = workspaces?.[0]?.id;
        if (!activeWorkspaceId) throw new Error('No active workspace available.');
        payload.workspace_id = activeWorkspaceId;
        const res = await handleCreateProperty(payload as any);
        if (!res.success) throw new Error('Could not create property.');
        success('Property Created', `${payload.name} has been added to your portfolio.`);
      } else if (property || propertyId) {
        const targetId = property?.id || propertyId;
        if (!targetId) throw new Error('Missing property ID.');
        const res = await handleUpdateProperty(targetId, payload as any);
        if (!res.success) throw new Error('Could not update property.');
        success('Property Updated', `${payload.name} details have been saved.`);
      }
      try {
        await refreshProperties();
      } catch (e) {
        console.error('Error refreshing properties context:', e);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Save failed', err.message || 'Could not save property details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const targetId = property?.id || propertyId;
    if (!targetId) return;
    setIsSaving(true);
    try {
      const res = await handleDeleteProperty(targetId);
      if (!res.success) throw new Error('Could not delete property.');
      success('Property Removed', 'The property has been deleted from your portfolio.');
      try {
        await refreshProperties();
      } catch (e) {
        console.error('Error refreshing properties context:', e);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Delete failed', err.message || 'Could not delete property.');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

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
            {isCreate ? 'Add Property' : 'Edit Property'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update address, details, and advertised rent.
          </p>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {/* Property Name */}
          <div>
            <Input
              label="Property Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset Heights (or leave blank to use address)"
              className="bg-white dark:bg-slate-800"
            />
          </div>

          {/* Street Address */}
          <div>
            <Input
              label="Street Address *"
              value={addressLine1}
              onChange={(e) => {
                setAddressLine1(e.target.value);
                if (formErrors.addressLine1) setFormErrors({ ...formErrors, addressLine1: '' });
              }}
              placeholder="e.g. 102 Street Road"
              className="bg-white dark:bg-slate-800"
            />
            {formErrors.addressLine1 && (
              <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.addressLine1}</p>
            )}
          </div>

          {/* Suburb & Postcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Suburb *"
                value={suburb}
                onChange={(e) => {
                  setSuburb(e.target.value);
                  if (formErrors.suburb) setFormErrors({ ...formErrors, suburb: '' });
                }}
                placeholder="e.g. Richmond"
                className="bg-white dark:bg-slate-800"
              />
              {formErrors.suburb && (
                <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.suburb}</p>
              )}
            </div>

            <div>
              <Input
                label="Postcode *"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  if (formErrors.postalCode) setFormErrors({ ...formErrors, postalCode: '' });
                }}
                placeholder="e.g. 3121"
                className="bg-white dark:bg-slate-800"
              />
              {formErrors.postalCode && (
                <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.postalCode}</p>
              )}
            </div>
          </div>

          {/* State */}
          <div>
            <Select
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="bg-white dark:bg-slate-800"
              options={[
                { value: 'VIC', label: 'Victoria' },
                { value: 'NSW', label: 'New South Wales' },
                { value: 'QLD', label: 'Queensland' },
                { value: 'WA', label: 'Western Australia' },
                { value: 'SA', label: 'South Australia' },
                { value: 'TAS', label: 'Tasmania' },
                { value: 'ACT', label: 'Australian Capital Territory' },
                { value: 'NT', label: 'Northern Territory' },
              ]}
            />
          </div>

          {/* Segmented Category Buttons (Residential / Commercial) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setPropertyCategory('Residential');
                setPropertyType('Apartment');
              }}
              className={cn(
                'h-11 rounded-xl font-semibold text-sm transition-all duration-150 border',
                propertyCategory === 'Residential'
                  ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
              )}
            >
              Residential
            </button>
            <button
              type="button"
              onClick={() => {
                setPropertyCategory('Commercial');
                setPropertyType('Office');
              }}
              className={cn(
                'h-11 rounded-xl font-semibold text-sm transition-all duration-150 border',
                propertyCategory === 'Commercial'
                  ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
              )}
            >
              Commercial
            </button>
          </div>

          {/* Property Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Property Type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="bg-white dark:bg-slate-800"
              options={
                propertyCategory === 'Residential'
                  ? [
                      { value: 'Apartment', label: 'Apartment' },
                      { value: 'House', label: 'House' },
                      { value: 'Townhouse', label: 'Townhouse' },
                      { value: 'Unit', label: 'Unit' },
                    ]
                  : [
                      { value: 'Office', label: 'Office' },
                      { value: 'Retail', label: 'Retail' },
                      { value: 'Industrial', label: 'Industrial' },
                      { value: 'Warehouse', label: 'Warehouse' },
                    ]
              }
            />

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-white dark:bg-slate-800"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          {/* Beds, Baths, Cars */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Beds"
              type="number"
              min="0"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="e.g. 2"
              className="bg-white dark:bg-slate-800 text-center"
            />
            <Input
              label="Baths"
              type="number"
              min="0"
              step="0.5"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              placeholder="e.g. 2"
              className="bg-white dark:bg-slate-800 text-center"
            />
            <Input
              label="Cars"
              type="number"
              min="0"
              value={carSpaces}
              onChange={(e) => setCarSpaces(e.target.value)}
              placeholder="e.g. 1"
              className="bg-white dark:bg-slate-800 text-center"
            />
          </div>

          {/* Advertised Rent */}
          <div>
            <Input
              label="Advertised Rent ($)"
              type="number"
              min="0"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder="e.g. 650"
              leftIcon={<span className="text-xs font-bold">$</span>}
              className="bg-white dark:bg-slate-800"
            />
          </div>

          {/* Australian GST Tracking Toggle */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label
                  onClick={() => setGstEnabled(!gstEnabled)}
                  className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer flex items-center gap-1.5"
                >
                  Australian GST Tracking
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Enable for commercial leases or properties registered for GST & BAS reporting
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={gstEnabled}
                onClick={() => setGstEnabled(!gstEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#008F83] focus:ring-offset-2',
                  gstEnabled ? 'bg-[#008F83]' : 'bg-slate-200 dark:bg-slate-700'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    gstEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
            {gstEnabled && (
              <p className="text-[11px] text-[#008F83] dark:text-emerald-400 font-medium pt-1">
                ✓ GST fields & 1/11th calculation enabled in transaction and expense modals for this property.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 mt-6 pt-2">
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
        title="Delete Property Asset"
        description="Are you sure you want to delete this property? Units, leases, and tenant associations should be reviewed first."
        confirmLabel="Delete Property"
        variant="danger"
      />
    </div>,
    document.body
  );
}
