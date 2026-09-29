import React from 'react';
import type { Metadata } from 'next';
import { fetchConditionReportsAction } from '@/app/actions/condition-reports';
import { ConditionReportsDashboard } from '@/components/dashboard/inspections/ConditionReportsDashboard';

export const metadata: Metadata = {
  title: 'Condition Reports & Inspections | PropertyLedge',
  description:
    'Digital move-in, routine, and exit condition inspections with checklists, defects, photos, and PDF sign-offs.',
};

export default async function InspectionsPage() {
  const res = await fetchConditionReportsAction();
  const initialReports = res.success && res.data ? res.data : [];

  return <ConditionReportsDashboard initialReports={initialReports} />;
}
