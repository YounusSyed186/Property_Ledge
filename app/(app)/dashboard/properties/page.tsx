import React from 'react';
import type { Metadata } from 'next';
import { fetchDashboardProperties } from '@/app/actions/dashboard';
import { PropertiesClientView } from '@/components/dashboard/properties/PropertiesClientView';

export const metadata: Metadata = {
  title: 'Properties | PropertyLedge',
  description: 'Central catalog to view, add, and manage real estate assets in your portfolio.',
};

export default async function PropertiesPage() {
  const initialProperties = await fetchDashboardProperties();
  return <PropertiesClientView initialProperties={initialProperties} />;
}
