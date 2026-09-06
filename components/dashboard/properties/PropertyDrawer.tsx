'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, useToast, Drawer, ConfirmDialog } from '@/components/admin/ui';
import { handleUpdateProperty, handleDeleteProperty, handleCreateProperty, fetchUserWorkspaces } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { Trash2, MapPin, Building2, BedDouble, DollarSign, FileText } from 'lucide-react';
import { DiceBearIcon } from '@/components/ui/avatar/DiceBearIcon';

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
  const [state, setState] = useState('NSW');
  const [postalCode, setPostalCode] = useState('');
  const [propertyCategory, setPropertyCategory] = useState<'Residential' | 'Commercial'>('Residential');
  const [propertyType, setPropertyType] = useState('House');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [carSpaces, setCarSpaces] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('Weekly');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (property && !isCreate) {
        setName(property.name || '');
        setAddressLine1(property.address_line_1 || property.address || '');
        setSuburb(property.suburb || property.city || '');
        setState(property.state || 'NSW');
        setPostalCode(property.postal_code || property.postcode || '');
        setPropertyCategory((property.property_category as any) || 'Residential');
        setPropertyType(property.property_type || (property.property_category === 'Commercial' ? 'Office' : 'House'));
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
      } else {
        setName('');
        setAddressLine1('');
        setSuburb('');
        setState('NSW');
        setPostalCode('');
        setPropertyCategory('Residential');
        setPropertyType('House');
        setBedrooms('');
        setBathrooms('');
        setCarSpaces('');
        setRentAmount('');
        setPaymentFrequency('Weekly');
        setStatus('active');
        setDescription('');
      }
      setFormErrors({});
    }
  }, [isOpen, property, isCreate]);

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!addressLine1.trim()) errors.addressLine1 = 'Street address is required.';
    if (!suburb.trim()) errors.suburb = 'Suburb / city is required.';
    if (!postalCode.trim()) errors.postalCode = 'Postcode is required.';
    if (!state) errors.state = 'State / Territory is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim() || addressLine1.trim(),
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

  const displayName = name.trim() || addressLine1.trim() || 'Property Details';
  const subtitleAddress = addressLine1 ? `${addressLine1}, ${suburb} ${state}` : 'New Property Asset';

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={isCreate ? 'Add Property' : `Edit ${displayName}`}
        description={isCreate ? 'Add a new real estate asset to your portfolio' : 'Update property location, features, and advertised terms'}
        footer={
          <div className="flex items-center justify-between w-full">
            {!isCreate && (property?.id || propertyId) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Property
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : isCreate ? 'Add Property' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 p-1">
          {/* Header Property Identity Preview Card */}
          <div className="p-4 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <DiceBearIcon
                name={propertyCategory === 'Commercial' ? 'building' : 'house'}
                badge
                variant="red"
                className="w-10 h-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-base text-admin-foreground truncate">
                  {displayName}
                </h3>
                <p className="text-xs text-admin-muted truncate mt-0.5 font-medium">
                  {subtitleAddress}
                </p>
              </div>
            </div>
            {rentAmount ? (
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-admin-primary uppercase tracking-wider block">
                  ${Number(rentAmount).toLocaleString()}
                </span>
                <span className="text-[10px] text-admin-muted capitalize">
                  {paymentFrequency.toLowerCase()}
                </span>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-admin-primary-soft text-admin-primary border border-admin-primary/20 shrink-0">
                {propertyCategory}
              </span>
            )}
          </div>

          {/* Location & Address Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-admin-primary" /> Location & Address
            </h4>

            <Input
              label="Property Name / Building Title (Optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset Heights Apartments"
            />

            <div>
              <Input
                label="Street Address *"
                value={addressLine1}
                onChange={(e) => {
                  setAddressLine1(e.target.value);
                  if (formErrors.addressLine1) setFormErrors({ ...formErrors, addressLine1: '' });
                }}
                placeholder="e.g. 42 Wallaby Way"
              />
              {formErrors.addressLine1 && <p className="text-[11px] text-red-500 mt-1">{formErrors.addressLine1}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Suburb / City *"
                  value={suburb}
                  onChange={(e) => {
                    setSuburb(e.target.value);
                    if (formErrors.suburb) setFormErrors({ ...formErrors, suburb: '' });
                  }}
                  placeholder="e.g. Sydney"
                />
                {formErrors.suburb && <p className="text-[11px] text-red-500 mt-1">{formErrors.suburb}</p>}
              </div>

              <div>
                <Input
                  label="Postcode *"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    if (formErrors.postalCode) setFormErrors({ ...formErrors, postalCode: '' });
                  }}
                  placeholder="e.g. 2000"
                />
                {formErrors.postalCode && <p className="text-[11px] text-red-500 mt-1">{formErrors.postalCode}</p>}
              </div>
            </div>

            <Select
              label="State / Territory *"
              value={state}
              onChange={(e) => setState(e.target.value)}
              options={[
                { value: 'NSW', label: 'New South Wales (NSW)' },
                { value: 'VIC', label: 'Victoria (VIC)' },
                { value: 'QLD', label: 'Queensland (QLD)' },
                { value: 'WA', label: 'Western Australia (WA)' },
                { value: 'SA', label: 'South Australia (SA)' },
                { value: 'TAS', label: 'Tasmania (TAS)' },
                { value: 'ACT', label: 'Australian Capital Territory (ACT)' },
                { value: 'NT', label: 'Northern Territory (NT)' },
              ]}
            />
          </div>

          {/* Category & Property Type Section */}
          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-admin-primary" /> Category & Type
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Category *"
                value={propertyCategory}
                onChange={(e) => {
                  const cat = e.target.value as 'Residential' | 'Commercial';
                  setPropertyCategory(cat);
                  setPropertyType(cat === 'Commercial' ? 'Office' : 'House');
                }}
                options={[
                  { value: 'Residential', label: 'Residential' },
                  { value: 'Commercial', label: 'Commercial' },
                ]}
              />

              <Select
                label="Property Type *"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                options={
                  propertyCategory === 'Residential'
                    ? [
                        { value: 'House', label: 'House' },
                        { value: 'Apartment/Unit', label: 'Apartment / Unit' },
                        { value: 'Townhouse', label: 'Townhouse' },
                        { value: 'Duplex', label: 'Duplex' },
                        { value: 'Villa', label: 'Villa' },
                      ]
                    : [
                        { value: 'Retail', label: 'Retail' },
                        { value: 'Office', label: 'Office' },
                        { value: 'Industrial', label: 'Industrial' },
                        { value: 'Warehouse', label: 'Warehouse' },
                      ]
                }
              />
            </div>
          </div>

          {/* Key Features & Capacity Section */}
          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-admin-primary" /> Key Features & Capacity
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Bedrooms"
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="e.g. 3"
              />
              <Input
                label="Bathrooms"
                type="number"
                min="0"
                step="0.5"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="e.g. 2"
              />
              <Input
                label="Car Spaces"
                type="number"
                min="0"
                value={carSpaces}
                onChange={(e) => setCarSpaces(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {/* Advertised Financials Section */}
          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Financials & Status
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Advertised Rent ($)"
                type="number"
                min="0"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="e.g. 650"
              />

              <Select
                label="Payment Frequency"
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value)}
                options={[
                  { value: 'Weekly', label: 'Weekly' },
                  { value: 'Fortnightly', label: 'Fortnightly' },
                  { value: 'Monthly', label: 'Monthly' },
                ]}
              />
            </div>

            <Select
              label="Property Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Active Asset' },
                { value: 'draft', label: 'Draft / Setup Pending' },
                { value: 'archived', label: 'Archived / Decommissioned' },
              ]}
            />
          </div>

          {/* Description & Overview Section */}
          <div className="space-y-4 pt-2 border-t border-admin-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-muted flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-admin-primary" /> Property Description & Notes
            </h4>
            <Textarea
              label="Description / Special Notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key features, inspection notes, or internal details for this property..."
              rows={3}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Property Asset"
        description="Are you sure you want to delete this property? Units, leases, and tenant associations should be reviewed first."
        confirmLabel="Delete Property"
        variant="danger"
      />
    </>
  );
}
