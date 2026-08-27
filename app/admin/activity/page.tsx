import React from 'react';
import { getAdminActivityLogs } from '@/lib/admin/queries';
import { PageContainer, PageHeader } from '@/components/admin/ui';
import { AdminActivityLogsView } from '@/components/admin/data-grid/views/AdminActivityLogsView';

export const revalidate = 0;

export default async function AdminActivityPage() {
  let logs: Awaited<ReturnType<typeof getAdminActivityLogs>> = [];
  let fetchError: string | null = null;

  try {
    logs = await getAdminActivityLogs();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load activity logs';
    console.error('Error fetching activity logs:', err);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Activity Logs"
        description="Immutable audit trail of all platform activities"
      />

      {fetchError && (
        <p className="mb-4 text-sm text-admin-danger">{fetchError}</p>
      )}

      <AdminActivityLogsView logs={logs} />
    </PageContainer>
  );
}
