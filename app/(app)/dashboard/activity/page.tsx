'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ColDef } from 'ag-grid-community';
import { PageContainer } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardActivity } from '@/app/actions/dashboard';
import { humanizeActivityLog } from '@/lib/activity/formatActivity';
import {
  Activity,
  RotateCw,
  Search,
  Filter,
  Building2,
  Calendar,
  FileCheck2,
  Receipt,
  Wrench,
  Key,
  ShieldCheck,
  Bot,
  User,
  Clock,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EntityFilter =
  | 'all'
  | 'lease'
  | 'payment'
  | 'maintenance'
  | 'inspection'
  | 'property'
  | 'tenant'
  | 'automation';

const FILTER_PILLS: Array<{
  id: EntityFilter;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'all', label: 'All Activity', icon: Activity },
  { id: 'inspection', label: 'Inspections', icon: FileCheck2 },
  { id: 'lease', label: 'Leases', icon: Key },
  { id: 'payment', label: 'Payments & Invoices', icon: Receipt },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'property', label: 'Properties', icon: Building2 },
  { id: 'automation', label: 'Automations', icon: Bot },
];

const columns: ColDef[] = [
  {
    field: 'created_at',
    headerName: 'Time',
    width: 170,
    cellRenderer: (params: { value: string }) => (
      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
        {params.value ? new Date(params.value).toLocaleString('en-AU') : '—'}
      </span>
    ),
  },
  {
    field: 'message',
    headerName: 'Activity Details',
    flex: 2,
    minWidth: 280,
    cellRenderer: (params: { data: any }) => (
      <div className="py-1">
        <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
          {params.data.message || params.data.action || 'Activity recorded'}
        </p>
        {params.data.property?.name && (
          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">
            📍 {params.data.property.name}
          </p>
        )}
      </div>
    ),
  },
  {
    field: 'entity_type',
    headerName: 'Entity Type',
    width: 140,
    cellRenderer: (params: { value: string }) => {
      const type = params.value || 'system';
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {type}
        </span>
      );
    },
  },
  {
    field: 'user',
    headerName: 'User / Actor',
    width: 160,
    cellRenderer: (params: { data: any }) => (
      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate block">
        {params.data.user?.full_name || 'System'}
      </span>
    ),
  },
];

export default function ActivityPage() {
  const { selectedProperty } = usePropertyContext();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<EntityFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());

  const loadActivity = async () => {
    setIsLoading(true);
    try {
      const propId = selectedProperty?.propertyId || null;
      const rawRows = await fetchDashboardActivity(propId);
      const formatted = (rawRows || []).map((row: any) => {
        const humanized = humanizeActivityLog(row);
        return {
          ...row,
          message: humanized.message || row.action || 'System action recorded',
        };
      });
      setRows(formatted);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [selectedProperty?.propertyId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadActivity();
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row: any) => {
      // Entity filter
      if (selectedFilter !== 'all') {
        const ent = String(row.entity_type || '').toLowerCase();
        if (selectedFilter === 'payment' && !ent.includes('payment') && !ent.includes('invoice') && !ent.includes('transaction')) {
          return false;
        } else if (selectedFilter === 'inspection' && !ent.includes('inspection') && !ent.includes('condition')) {
          return false;
        } else if (selectedFilter === 'lease' && !ent.includes('lease') && !ent.includes('tenant')) {
          return false;
        } else if (selectedFilter === 'maintenance' && !ent.includes('maintenance') && !ent.includes('repair') && !ent.includes('task')) {
          return false;
        } else if (selectedFilter === 'property' && !ent.includes('property') && !ent.includes('unit')) {
          return false;
        } else if (selectedFilter === 'automation' && !ent.includes('automation') && !ent.includes('trigger')) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = String(row.message || '').toLowerCase();
        const ent = String(row.entity_type || '').toLowerCase();
        const user = String(row.user?.full_name || '').toLowerCase();
        const prop = String(row.property?.name || '').toLowerCase();
        return msg.includes(q) || ent.includes(q) || user.includes(q) || prop.includes(q);
      }

      return true;
    });
  }, [rows, selectedFilter, searchQuery]);

  return (
    <PageContainer className="h-full flex flex-col p-4 sm:p-6 gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Activity Monitor & Audit Trail
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase tracking-wider">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedProperty?.propertyName
              ? `Filtered for ${selectedProperty.propertyName}`
              : 'Real-time chronological events across your entire portfolio workspace'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50 min-h-[38px]"
          >
            <RotateCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {FILTER_PILLS.map((pill) => {
            const Icon = pill.icon;
            const isSelected = selectedFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedFilter(pill.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[36px]',
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events, users, properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[38px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {filteredRows.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                No activity logs found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {searchQuery || selectedFilter !== 'all'
                  ? 'No activity matched your filter criteria. Try changing filters or clearing search.'
                  : 'Activity events will appear here as actions (inspections, payments, leases, maintenance) are executed.'}
              </p>
            </div>
            {(searchQuery || selectedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <AdminDataGrid
            rowData={filteredRows}
            columnDefs={columns}
            loading={isLoading}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            lastRefreshedAt={lastRefreshedAt}
            labelSingular="event"
            labelPlural="events"
            searchPlaceholder="Filter rows in view..."
            getRowId={(params) => String(params.data.id || Math.random())}
          />
        )}
      </div>
    </PageContainer>
  );
}
