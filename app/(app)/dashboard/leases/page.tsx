import React from 'react';
import type { Metadata } from 'next';
import { LeaseManagementPage } from '@/components/dashboard/leases/LeaseManagementPage';
import { fetchAllWorkspaceLeases, fetchDashboardProperties } from '@/app/actions/dashboard';

export const metadata: Metadata = {
  title: 'Leases | PropertyLedge',
  description: 'Manage active leases, renewals, and periodic conversions.',
};

export default async function LeasesPage() {
  const [leasesData, propertiesData] = await Promise.all([
    fetchAllWorkspaceLeases(),
    fetchDashboardProperties(),
  ]);

  return (
    <LeaseManagementPage
      initialLeases={leasesData as any}
      initialProperties={propertiesData as any}
    />
  );
}
