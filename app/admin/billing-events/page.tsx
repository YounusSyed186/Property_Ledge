import React from 'react';
import { getAdminBillingEvents } from '@/lib/admin/queries';
import { PageContainer, PageHeader } from '@/components/admin/ui';
import { AdminBillingEventsView } from '@/components/admin/data-grid/views/AdminBillingEventsView';

export const revalidate = 0;

export default async function AdminBillingEventsPage() {
  const { data: events } = await getAdminBillingEvents({ page: 1, limit: 100 });

  return (
    <PageContainer>
      <AdminBillingEventsView initialEvents={events || []} />
    </PageContainer>
  );
}