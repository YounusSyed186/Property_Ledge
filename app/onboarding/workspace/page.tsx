'use client';

import React, { useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { Building2, Home, Briefcase } from 'lucide-react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { FormField, inputClassName } from '@/components/onboarding/FormField';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { saveOnboardingWorkspaceSetup } from '@/app/actions/onboarding';
import type { BusinessType } from '@/lib/onboarding/state';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BUSINESS_TYPES: { id: BusinessType; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'property_management',
    title: 'Property management',
    description: 'I manage properties for owners',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: 'property_owner',
    title: 'Property owner',
    description: 'I manage my own properties',
    icon: <Home className="h-4 w-4" />,
  },
  {
    id: 'real_estate_operations',
    title: 'Real estate operations',
    description: 'I manage a larger property portfolio',
    icon: <Building2 className="h-4 w-4" />,
  },
];

export default function OnboardingWorkspacePage() {
  const { navigate } = useOnboardingNav();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('property_owner');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setWorkspaceName(value);
    if (!slug || slug === slugify(workspaceName)) setSlug(slugify(value));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Full name is required';
    if (!workspaceName.trim()) next.workspaceName = 'Workspace name is required';
    if (!slug.trim()) next.slug = 'Workspace slug is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveOnboardingWorkspaceSetup({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        workspaceName: workspaceName.trim(),
        workspaceSlug: slug.trim(),
        businessType,
      });
      navigate('/onboarding/subscription');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your workspace. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <form onSubmit={handleSubmit}>
        <OnboardingStep
          eyebrow="Workspace"
          title="Create your workspace"
          description="This is where your properties, tenants, leases, and team will live."
        >
          <div className="space-y-4">
            <FormField id="fullName" label="Full name" error={errors.fullName}>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClassName}
                placeholder="Jane Smith"
              />
            </FormField>

            <FormField id="phone" label="Phone (optional)">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClassName}
                placeholder="+61 400 000 000"
              />
            </FormField>

            <FormField id="workspaceName" label="Workspace name" error={errors.workspaceName}>
              <input
                id="workspaceName"
                type="text"
                value={workspaceName}
                onChange={(e) => handleNameChange(e.target.value)}
                className={inputClassName}
                placeholder="Williams Property Holdings"
              />
            </FormField>

            <FormField
              id="slug"
              label="Workspace slug"
              hint={slug ? `propertyledge.com/${slug}` : undefined}
              error={errors.slug}
            >
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className={inputClassName}
                placeholder="williams-property-holdings"
              />
            </FormField>

            <div className="space-y-2">
              <p className="text-sm font-medium text-admin-foreground">What best describes your business?</p>
              <div className="space-y-2">
                {BUSINESS_TYPES.map((type) => (
                  <SelectionCard
                    key={type.id}
                    id={type.id}
                    name="businessType"
                    title={type.title}
                    description={type.description}
                    icon={type.icon}
                    selected={businessType === type.id}
                    onSelect={() => setBusinessType(type.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <OnboardingFooter
            onBack={() => navigate('/onboarding')}
            continueLabel={isSaving ? 'Creating workspace…' : 'Continue'}
            continueType="submit"
            continueLoading={isSaving}
            error={error}
          />
        </OnboardingStep>
      </form>
    </OnboardingContent>
  );
}
