import React from 'react';
import { getAdminAuditLogs } from '@/lib/admin/queries';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Pagination,
  EmptyState,
} from '@/components/admin/ui';
import { ShieldCheck } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);

  const { data: logs, totalPages, total } = await getAdminAuditLogs({ page, limit: 10 });

  const getActionVariant = (action: string) => {
    if (action.includes('CREATED')) return 'success' as const;
    if (action.includes('DELETED') || action.includes('REMOVED')) return 'danger' as const;
    if (action.includes('UPDATED')) return 'info' as const;
    return 'warning' as const;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all administrative actions across the platform."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Operations</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Audit Logs</span>
          </nav>
        }
      />

      <Card>
        <CardHeader
          title="Administrative Actions"
          description="Who did what, when, and to which resource"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        {logs.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No audit logs yet"
            description="Administrative actions will be recorded here as they occur."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-body-sm text-admin-foreground">{log.target_type}</p>
                        <p className="text-metadata font-mono text-admin-muted truncate max-w-[180px]">
                          {log.target_id || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-body-sm text-admin-foreground">{log.profiles?.full_name || 'Admin'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-metadata font-mono text-admin-muted">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 40) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-caption text-admin-muted">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              onPageChange={(newPage) => {
                const url = new URL(window.location.href);
                url.searchParams.set('page', String(newPage));
                window.location.href = url.toString();
              }}
            />
          </>
        )}
      </Card>
    </PageContainer>
  );
}