'use client';

import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { EmptyState, Button } from '@/components/admin/ui';

interface PropertyRequiredProps {
  children: React.ReactNode;
  message?: string;
  allowAllProperties?: boolean;
}

export function PropertyRequired({ children, message, allowAllProperties = false }: PropertyRequiredProps) {
  const { selectedProperty, isLoading, availableProperties } = usePropertyContext();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full border-2 border-admin-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (availableProperties.length === 0 && !allowAllProperties) {
    return (
      <EmptyState
        icon={<Building2 className="w-8 h-8" />}
        title="No properties yet"
        description="Create a property to start managing leases, tenants, and payments."
        action={
          <Button href="/dashboard/properties?new=true" size="sm">
            Add property
          </Button>
        }
      />
    );
  }

  if (!selectedProperty && !allowAllProperties) {
    return (
      <EmptyState
        icon={<Building2 className="w-8 h-8" />}
        title="Select a property"
        description={message || 'Choose a property from the selector in the header to view this page.'}
      />
    );
  }

  return <>{children}</>;
}
