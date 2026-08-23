import React from 'react';
import { getAdminBillingEvents } from '@/lib/admin/queries';
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
import { History } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminBillingEventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);

  const { data: events, totalPages, total } = await getAdminBillingEvents({ page, limit: 10 });

  const getStatusVariant = (status: string) => {
    if (status === 'processed') return 'success' as const;
    if (status === 'failed') return 'danger' as const;
    return 'info' as const;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Billing Events"
        description="Audit history of billing provider webhook events and processing status."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Operations</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Billing Events</span>
          </nav>
        }
      />

      <Card>
        <CardHeader
          title="Webhook Event Log"
          description="Immutable audit trail of billing provider events"
          icon={<History className="w-5 h-5" />}
        />
        {events.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title="No billing events logged"
            description="Billing webhook events will appear here as they are processed."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider Event ID</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((evt: any) => (
                  <TableRow key={evt.id}>
                    <TableCell>
                      <span className="font-mono text-caption text-admin-foreground">{evt.provider_event_id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-admin-primary">{evt.event_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-caption text-admin-muted">{evt.account_id || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(evt.status)} dot>
                        {evt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-caption text-admin-muted">
                        {new Date(evt.processed_at).toLocaleString()}
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