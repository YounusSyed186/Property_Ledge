'use client';

import { use } from 'react';
import { LeaseDetailHub } from '@/components/dashboard/hubs/LeaseDetailHub';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';

export default function LeaseDetailPage({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const { leaseId } = use(params);
  const { selectedProperty } = usePropertyContext();

  return (
    <PropertyRequired message="Select a property to view this lease.">
      {selectedProperty && (
        <LeaseDetailHub
          propertyId={selectedProperty.propertyId}
          leaseId={leaseId}
        />
      )}
    </PropertyRequired>
  );
}
