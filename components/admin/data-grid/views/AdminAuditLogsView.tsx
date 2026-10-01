'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { Badge } from '@/components/admin/ui';
import { ShieldCheck } from 'lucide-react';
import { fetchAdminAuditLogs } from '@/app/actions/admin';

interface AdminAuditLogsViewProps {
  initialLogs: any[];
}

export function AdminAuditLogsView({ initialLogs }: AdminAuditLogsViewProps) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetchAdminAuditLogs({ page: 1, limit: 100 });
      if (res && res.data) {
        setLogs(res.data);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to refresh audit logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Actions', count: logs.length },
      {
        value: 'CREATED',
        label: 'Created',
        count: logs.filter((l) => l.action?.includes('CREATED')).length,
      },
      {
        value: 'UPDATED',
        label: 'Updated',
        count: logs.filter((l) => l.action?.includes('UPDATED')).length,
      },
      {
        value: 'DELETED',
        label: 'Deleted / Removed',
        count: logs.filter((l) => l.action?.includes('DELETED') || l.action?.includes('REMOVED')).length,
      },
    ],
    [logs]
  );

  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return logs;
    return logs.filter((l) => l.action?.includes(activeFilter));
  }, [logs, activeFilter]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'action',
        headerName: 'Action Executed',
        minWidth: 200,
        flex: 1.2,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const action = params.value || '';
          let variant: 'success' | 'danger' | 'info' | 'warning' = 'info';
          if (action.includes('CREATED')) variant = 'success';
          else if (action.includes('DELETED') || action.includes('REMOVED')) variant = 'danger';
          else if (action.includes('UPDATED')) variant = 'info';
          else variant = 'warning';

          return (
            <Badge variant={variant} size="sm">
              {action}
            </Badge>
          );
        },
      },
      {
        field: 'target_type',
        headerName: 'Target Resource',
        minWidth: 170,
        flex: 1,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <div className="flex flex-col justify-center">
            <span className="font-semibold text-admin-foreground text-[13px]">
              {params.value}
            </span>
            {params.data?.target_id && (
              <span className="font-mono text-metadata text-admin-muted truncate max-w-[160px]">
                {params.data.target_id}
              </span>
            )}
          </div>
        ),
      },
      {
        field: 'profiles.full_name',
        headerName: 'Admin Performed',
        minWidth: 160,
        flex: 1,
        filter: 'agTextColumnFilter',
        valueGetter: (params: any) => params.data?.profiles?.full_name || 'Admin',
        cellRenderer: (params: any) => (
          <span className="font-medium text-admin-foreground text-[13px]">
            {params.value}
          </span>
        ),
      },
      {
        field: 'metadata',
        headerName: 'Metadata',
        minWidth: 200,
        flex: 1.5,
        cellRenderer: 'codeCell',
        filter: false,
      },
      {
        field: 'created_at',
        headerName: 'Timestamp',
        minWidth: 180,
        cellRenderer: 'dateCell',
        filter: 'agDateColumnFilter',
      },
    ],
    []
  );

  return (
    <AdminDataGrid
      rowData={filteredLogs}
      columnDefs={columnDefs}
      enableSelection={true}
      enableColumnChooser={true}
      enableExport={true}
      exportFilename="propertyledge-audit-logs"
      searchPlaceholder="Search audit log actions, resources, IDs..."
      leftToolbarContent={
        <QuickFilterBar
          options={filterOptions}
          activeValue={activeFilter}
          onChange={setActiveFilter}
        />
      }
      labelSingular="log"
      labelPlural="logs"
      emptyTitle="No audit logs recorded"
      emptyDescription="Administrative actions will appear here in chronological order."
      emptyIcon={<ShieldCheck className="w-6 h-6" />}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      lastRefreshedAt={lastRefreshedAt}
    />
  );
}
