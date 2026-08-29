import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/properties/${id}`);
}
