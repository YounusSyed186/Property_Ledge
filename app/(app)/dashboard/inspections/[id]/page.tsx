import { redirect } from 'next/navigation';

interface InspectionRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function InspectionRedirectPage({ params }: InspectionRedirectProps) {
  const { id } = await params;
  redirect(`/dashboard/condition-reports/${id}`);
}
