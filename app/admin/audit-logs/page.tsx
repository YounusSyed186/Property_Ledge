import React from 'react';
import { getAdminAuditLogs } from '@/lib/admin/queries';
import { PageContainer, PageHeader } from '@/components/admin/ui';
import { AdminAuditLogsView } from '@/components/admin/data-grid/views/AdminAuditLogsView';

export const revalidate = 0;

export default async function AdminAuditLogsPage() {
  const { data: logs } = await getAdminAuditLogs({ page: 1, limit: 100 });

  return (
    <PageContainer>
      <AdminAuditLogsView initialLogs={logs || []} />
    </PageContainer>
  );
}