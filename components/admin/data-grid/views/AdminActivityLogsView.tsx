'use client';

import React, { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { Activity, User, Building2, Home } from 'lucide-react';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Badge } from '@/components/admin/ui';
import type { AdminActivityLogRow } from '@/lib/admin/types';
import { fetchAdminActivityLogs } from '@/app/actions/admin';

interface AdminActivityLogsViewProps {
  logs: AdminActivityLogRow[];
}

export function AdminActivityLogsView({ logs: initialLogs }: AdminActivityLogsViewProps) {
  const [logs, setLogs] = useState<AdminActivityLogRow[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshLogs = await fetchAdminActivityLogs();
      setLogs(freshLogs);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to refresh activity logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  };
  const columnDefs = useMemo<ColDef<AdminActivityLogRow>[]>(
    () => [
      {
        headerName: 'Time',
        field: 'created_at',
        minWidth: 180,
        cellRenderer: (params: { value: string }) => (
          <span className="font-mono text-sm">{new Date(params.value).toLocaleString()}</span>
        ),
      },
      {
        headerName: 'Action',
        field: 'action',
        minWidth: 160,
        cellRenderer: (params: { value: string }) => (
          <Badge variant="neutral" className="text-xs px-2 py-0.5">
            {params.value}
          </Badge>
        ),
      },
      {
        headerName: 'Entity',
        field: 'entity_type',
        minWidth: 160,
        cellRenderer: (params: { data: AdminActivityLogRow }) => (
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
        minWidth: 180,
        cellRenderer: (params: { data: AdminActivityLogRow }) => (
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
        minWidth: 140,
        cellRenderer: (params: { data: AdminActivityLogRow }) => (
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{params.data.property?.name || 'N/A'}</span>
          </div>
        ),
      },
      {
        headerName: 'Workspace',
        field: 'workspace',
        minWidth: 140,
        cellRenderer: (params: { data: AdminActivityLogRow }) => (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{params.data.workspace?.name || 'N/A'}</span>
          </div>
        ),
      },
      {
        headerName: 'Details',
        field: 'metadata',
        minWidth: 200,
        flex: 1,
        cellRenderer: (params: { value: Record<string, unknown> }) => {
          const metadata = params.value;
          if (!metadata || Object.keys(metadata).length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <pre className="text-xs text-muted-foreground max-h-16 overflow-auto font-mono">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          );
        },
      },
    ],
    []
  );

  return (
    <AdminDataGrid
      rowData={logs}
      columnDefs={columnDefs}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      lastRefreshedAt={lastRefreshedAt}
      searchPlaceholder="Search activity logs..."
      emptyTitle="No activity logs"
      emptyDescription="Activity logs will appear here as users perform actions."
      emptyIcon={<Activity className="w-12 h-12 text-muted-foreground/50" />}
      defaultPageSize={50}
      labelSingular="log"
      labelPlural="logs"
    />
  );
}
