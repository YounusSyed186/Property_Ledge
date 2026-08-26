import { UnitDetailHub } from '@/components/dashboard/hubs/UnitDetailHub';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  return <UnitDetailHub propertyId={id} unitId={unitId} />;
}
