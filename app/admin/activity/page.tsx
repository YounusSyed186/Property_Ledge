import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer, PageHeader, Card, CardHeader, CardContent, Badge, EmptyState } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import type { ColDef } from 'ag-grid-community';
import { Activity, Search, Filter, User, Building2, Home } from 'lucide-react';

export const revalidate = 0;

interface ActivityLog {
  id: string;
  workspace_id: string | null;
  property_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: { full_name: string; email: string };
  property?: { name: string };
  workspace?: { name: string };
}

async function getActivityLogs(): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:profiles!activity_logs_user_id_fkey(full_name, email),
      property:properties!activity_logs_property_id_fkey(name),
      workspace:workspaces!activity_logs_workspace_id_fkey(name)
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }

  return (data || []).map((log: any) => ({
    ...log,
    user: log.user || { full_name: 'System', email: '' },
    property: log.property || { name: 'N/A' },
    workspace: log.workspace || { name: 'N/A' },
  }));
}

const columns: ColDef<ActivityLog>[] = [
  {
    headerName: 'Time',
    field: 'created_at',
    cellRenderer: (params: any) => (
      <span className="font-mono text-sm">{new Date(params.value).toLocaleString()}</span>
    ),
  },
  {
    headerName: 'Action',
    field: 'action',
    cellRenderer: (params: any) => (
      <Badge variant="neutral" className="text-xs px-2 py-0.5">
        {params.value}
      </Badge>
    ),
  },
  {
    headerName: 'Entity',
    field: 'entity_type',
    cellRenderer: (params: any) => (
      <div>
        <p className="font-medium capitalize">{params.data.entity_type}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {params.data.entity_id || '—'}
        </p>
      </div>
    ),
  },
  {
    headerName: 'User',
    field: 'user',
    cellRenderer: (params: any) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{params.data.user?.full_name || 'System'}</p>
          <p className="text-xs text-muted-foreground">{params.data.user?.email || ''}</p>
        </div>
      </div>
    ),
  },
  {
    headerName: 'Property',
    field: 'property',
    cellRenderer: (params: any) => (
      <div className="flex items-center gap-2">
        <Home className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{params.data.property?.name || 'N/A'}</span>
      </div>
    ),
  },
  {
    headerName: 'Workspace',
    field: 'workspace',
    cellRenderer: (params: any) => (
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{params.data.workspace?.name || 'N/A'}</span>
      </div>
    ),
  },
  {
    headerName: 'Details',
    field: 'metadata',
    cellRenderer: (params: any) => {
      const metadata = params.value;
      if (!metadata || Object.keys(metadata).length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <pre className="text-xs text-muted-foreground max-h-16 overflow-auto font-mono">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      );
    },
  },
];

export default async function AdminActivityPage() {
  const logs = await getActivityLogs();

  return (
    <PageContainer>
      <PageHeader
        title="Activity Logs"
        description="Immutable audit trail of all platform activities"
        actions={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Actions</option>
              <option value="property.created">Property Created</option>
              <option value="property.updated">Property Updated</option>
              <option value="tenant.created">Tenant Created</option>
              <option value="lease.created">Lease Created</option>
              <option value="payment.created">Payment Created</option>
              <option value="maintenance.created">Maintenance Created</option>
              <option value="subscription.approved">Subscription Approved</option>
              <option value="user.invited">User Invited</option>
            </select>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search activity logs..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdminDataGrid
            rowData={logs}
            columnDefs={columns}
            emptyTitle="No activity logs"
            emptyDescription="Activity logs will appear here as users perform actions."
            emptyIcon={<Activity className="w-12 h-12 text-muted-foreground/50" />}
            defaultPageSize={50}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}