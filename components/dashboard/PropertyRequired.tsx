'use client';

import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { EmptyState, Button } from '@/components/admin/ui';

interface PropertyRequiredProps {
  children: React.ReactNode;
  message?: string;
}

export function PropertyRequired({ children, message }: PropertyRequiredProps) {
  const { selectedProperty, isLoading, availableProperties } = usePropertyContext();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full border-2 border-admin-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (availableProperties.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="w-8 h-8" />}
        title="No properties yet"
        description="Create a property to start managing units, tenants, and more."
        action={
          <Link href="/dashboard/properties?new=true">
            <Button size="sm">Create Property</Button>
          </Link>
        }
      />
    );
  }

  if (!selectedProperty) {
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
