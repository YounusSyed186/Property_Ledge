import { TenantDetailHub } from '@/components/dashboard/hubs/TenantDetailHub';

export default async function Page({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <TenantDetailHub tenantId={tenantId} />;
}
