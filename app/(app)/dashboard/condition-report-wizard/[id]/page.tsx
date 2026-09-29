import { redirect } from 'next/navigation';

interface WizardRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function ConditionReportWizardRedirectPage({
  params,
}: WizardRedirectProps) {
  const { id } = await params;
  redirect(`/dashboard/inspections/${id}`);
}
