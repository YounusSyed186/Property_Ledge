'use client';

import React, { useEffect, useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { FormField, inputClassName } from '@/components/onboarding/FormField';
import { createOnboardingProperty, getOnboardingProgress, skipOnboardingProperty } from '@/app/actions/onboarding';
import { cn } from '@/lib/utils';

const PROPERTY_TYPES = [
  'Apartment / Multifamily',
  'Single Family',
  'Commercial',
  'Mixed Use',
  'Other',
];

export default function OnboardingPropertyPage() {
  const { navigate } = useOnboardingNav();
  const [workspaceId, setWorkspaceId] = useState('');
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingProgress().then((progress) => {
      const id = progress.data.workspaceId as string | undefined;
      if (id) setWorkspaceId(id);
    });
  }, []);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Property name is required';
    if (!addressLine1.trim()) next.addressLine1 = 'Address is required';
    if (!city.trim()) next.city = 'City is required';
    if (!state.trim()) next.state = 'State is required';
    if (!postalCode.trim()) next.postalCode = 'Postal code is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError('Please create a workspace first.');
      return;
    }
    if (!validate()) return;
    setIsSaving(true);
    setError(null);
    try {
      await createOnboardingProperty({
        workspaceId,
        name: name.trim(),
        propertyType,
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
      });
      navigate('/onboarding/complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create property. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await skipOnboardingProperty();
      navigate('/onboarding/complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <form onSubmit={handleSubmit}>
        <OnboardingStep
          eyebrow="Step 3 of 4"
          title="Let's add your first property."
          description="Start with one property. You can add more properties from your dashboard whenever you're ready."
        >
          <div className="space-y-4 mt-6">
            <FormField id="propertyName" label="Property name" error={errors.name}>
              <input
                id="propertyName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClassName}
                placeholder="Sunset Apartments"
              />
            </FormField>

            <FormField id="propertyType" label="Property type">
              <div className="relative">
                <select
                  id="propertyType"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className={cn(inputClassName, "appearance-none bg-admin-surface pr-10 cursor-pointer")}
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-admin-muted">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </FormField>

            <FormField id="address" label="Address" error={errors.addressLine1}>
              <input
                id="address"
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className={inputClassName}
                placeholder="123 Main Street"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField id="city" label="City" error={errors.city}>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClassName}
                  placeholder="Melbourne"
                />
              </FormField>
              <FormField id="state" label="State" error={errors.state}>
                <input
                  id="state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={inputClassName}
                  placeholder="Victoria"
                />
              </FormField>
            </div>

            <FormField id="postalCode" label="Postal code" error={errors.postalCode}>
              <input
                id="postalCode"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className={inputClassName}
                placeholder="3000"
              />
            </FormField>
          </div>

          <OnboardingFooter
            onBack={() => navigate('/onboarding/subscription')}
            continueLabel={isSaving ? 'Creating property…' : 'Create property'}
            continueType="submit"
            continueLoading={isSaving}
            skipLabel="I'll do this later"
            onSkip={handleSkip}
            error={error}
          />
        </OnboardingStep>
      </form>
    </OnboardingContent>
  );
}
