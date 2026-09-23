import React from 'react';
import type { Metadata } from 'next';
import { TenantDirectoryPage } from '@/components/dashboard/tenants/TenantDirectoryPage';
import { fetchAllWorkspaceTenants, fetchDashboardProperties } from '@/app/actions/dashboard';

export const metadata: Metadata = {
  title: 'People | PropertyLedge',
  description: 'Manage residents, applicants, and tenant directories.',
};

export default async function PeoplePage() {
  const [tenantsData, propertiesData] = await Promise.all([
    fetchAllWorkspaceTenants(),
    fetchDashboardProperties(),
  ]);

  return (
    <TenantDirectoryPage
      initialTenants={tenantsData as any}
      initialProperties={propertiesData as any}
    />
  );
}
