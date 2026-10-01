'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { History } from 'lucide-react';
import { fetchAdminBillingEvents } from '@/app/actions/admin';

interface AdminBillingEventsViewProps {
  initialEvents: any[];
}

export function AdminBillingEventsView({ initialEvents }: AdminBillingEventsViewProps) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetchAdminBillingEvents({ page: 1, limit: 100 });
      if (res && res.data) {
        setEvents(res.data);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to refresh billing events:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Events', count: events.length },
      {
        value: 'processed',
        label: 'Processed',
        count: events.filter((e) => e.status === 'processed').length,
      },
      {
        value: 'received',
        label: 'Received',
        count: events.filter((e) => e.status === 'received').length,
      },
      {
        value: 'failed',
        label: 'Failed',
        count: events.filter((e) => e.status === 'failed').length,
      },
    ],
    [events]
  );

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events;
    return events.filter((e) => e.status === activeFilter);
  }, [events, activeFilter]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'provider_event_id',
        headerName: 'Provider Event ID',
        minWidth: 220,
        flex: 1.2,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'event_type',
        headerName: 'Event Type',
        minWidth: 200,
        flex: 1.2,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span className="font-semibold text-admin-foreground text-[13.5px]">
            {params.value}
          </span>
        ),
      },
      {
        field: 'account_id',
        headerName: 'Account ID',
        minWidth: 160,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        cellRenderer: 'statusCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'processed_at',
        headerName: 'Processed At',
        minWidth: 180,
        cellRenderer: 'dateCell',
        filter: 'agDateColumnFilter',
      },
    ],
    []
  );

  return (
    <AdminDataGrid
      rowData={filteredEvents}
      columnDefs={columnDefs}
      enableSelection={true}
      enableColumnChooser={true}
      enableExport={true}
      exportFilename="propertyledge-billing-events"
      searchPlaceholder="Search events by ID or type..."
      leftToolbarContent={
        <QuickFilterBar
          options={filterOptions}
          activeValue={activeFilter}
          onChange={setActiveFilter}
        />
      }
      labelSingular="event"
      labelPlural="events"
      emptyTitle="No billing events logged"
      emptyDescription="Billing webhook events will appear here as they are processed."
      emptyIcon={<History className="w-6 h-6" />}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      lastRefreshedAt={lastRefreshedAt}
    />
  );
}
