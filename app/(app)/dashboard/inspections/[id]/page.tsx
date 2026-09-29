import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchConditionReportDetailAction } from '@/app/actions/condition-reports';
import { ConditionReportWizard } from '@/components/dashboard/inspections/ConditionReportWizard';

interface InspectionWizardPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: InspectionWizardPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Inspection Workspace | PropertyLedge`,
    description: `Perform property condition inspection, checklist ratings, photos, and signatures.`,
  };
}

export default async function InspectionWizardPage({
  params,
}: InspectionWizardPageProps) {
  const { id } = await params;
  const res = await fetchConditionReportDetailAction(id);

  if (!res.success || !res.data) {
    notFound();
  }

  return <ConditionReportWizard reportId={id} initialData={res.data} />;
}
