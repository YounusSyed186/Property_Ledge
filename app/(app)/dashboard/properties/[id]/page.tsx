import { PropertyDetailHub } from '@/components/dashboard/hubs/PropertyDetailHub';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetailHub propertyId={id} />;
}
