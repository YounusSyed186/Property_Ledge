'use client';

import React from 'react';
import { ColDef } from 'ag-grid-community';
import { Home, Pencil, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getTenantTableColumns(
  onEditTenant: (tenant: Record<string, unknown>) => void
): ColDef[] {
  return [
    {
      field: 'name',
      headerName: 'TENANT NAME',
      minWidth: 240,
      flex: 1.6,
      valueGetter: (params) => {
        const d = params.data;
        return `${d?.first_name || ''} ${d?.last_name || ''}`.trim() || d?.email || 'Tenant';
      },
      cellRenderer: (params: { data: Record<string, unknown>; rowIndex: number }) => {
        const tenant = params.data;
        if (!tenant) return null;
        const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant';
        const email = String(tenant.email || '');
        const initials = fullName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'T';

        const colorVariants = [
          'bg-teal-50 text-[#008F83] border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
          'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
          'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
        ];
        const colorClass = colorVariants[(params.rowIndex || 0) % colorVariants.length];

        return (
          <div className="flex items-center gap-3 py-1 min-w-0 max-w-full overflow-hidden" title={fullName}>
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border select-none shadow-xs',
                colorClass
              )}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-[13.5px] truncate block">
                {fullName}
              </span>
              {email && (
                <span className="text-[11.5px] text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-normal">
                  {email}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      field: 'phone',
      headerName: 'CONTACT',
      width: 150,
      valueGetter: (params) => params.data?.phone || '—',
      cellRenderer: (params: { value: string }) => (
        <span className="text-xs sm:text-[12.5px] text-slate-700 dark:text-slate-300 font-medium tabular-nums">
          {params.value}
        </span>
      ),
    },
    {
      field: 'assigned_property',
      headerName: 'ASSIGNED PROPERTY',
      minWidth: 200,
      flex: 1.3,
      valueGetter: (params) => {
        const prop = params.data?.property as { name?: string; address_line_1?: string; city?: string } | undefined;
        if (!prop) return 'Unassigned';
        return prop.name || prop.address_line_1 || 'Unassigned';
      },
      cellRenderer: (params: { data: Record<string, unknown> }) => {
        const prop = params.data?.property as { name?: string; address_line_1?: string; city?: string; suburb?: string } | undefined;
        if (!prop) {
          return <span className="text-xs text-slate-400 dark:text-[#7F8B99]">Unassigned</span>;
        }
        const name = prop.name || prop.address_line_1 || 'Property';
        const location = prop.city || prop.suburb || '';

        return (
          <div className="flex items-center gap-2.5 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
            <div className="h-8 w-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/70 dark:border-orange-500/30 shadow-xs">
              <Home className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-[13px] truncate block">
                {name}
              </span>
              {location && (
                <span className="text-[11.5px] text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5">
                  {location}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      field: 'active_lease',
      headerName: 'ACTIVE LEASE',
      width: 150,
      valueGetter: (params) => {
        const leaseTenants = params.data?.lease_tenants as Array<{ lease?: { rent_amount?: number; rent_frequency?: string; status?: string } }> | undefined;
        const activeLease = leaseTenants?.find((lt) => lt.lease?.status === 'active')?.lease || leaseTenants?.[0]?.lease;
        if (!activeLease || !activeLease.rent_amount) return '—';
        return `$${Number(activeLease.rent_amount).toLocaleString()}/${activeLease.rent_frequency || 'yearly'}`;
      },
      cellRenderer: (params: { value: string }) => (
        <span className={cn('text-xs sm:text-[13px] font-semibold tabular-nums', params.value === '—' ? 'text-slate-400 dark:text-[#7F8B99]' : 'text-slate-900 dark:text-white')}>
          {params.value}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 120,
      cellRenderer: (params: { data: Record<string, unknown> }) => {
        const rawStatus = String(params.data?.status || 'active').toLowerCase();
        let label = 'Active';
        let badgeClass = 'bg-[#E7F8F1] text-[#008F83] border-[#008F83]/25 dark:bg-[#008F83]/20 dark:text-[#32D5C4] dark:border-[#008F83]/30';

        if (rawStatus === 'archived') {
          label = 'Archived';
          badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        } else if (rawStatus === 'prospect' || rawStatus === 'applicant' || rawStatus === 'pending') {
          label = 'Prospect';
          badgeClass = 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200/80 dark:border-purple-500/30';
        } else if (rawStatus === 'inactive' || rawStatus === 'past' || rawStatus === 'ended') {
          label = 'Past';
          badgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/30';
        }

        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide',
              badgeClass
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{label}</span>
          </span>
        );
      },
    },
    {
      headerName: 'ACTIONS',
      colId: 'actions',
      width: 110,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Record<string, unknown> }) => {
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditTenant(params.data);
              }}
              className="px-2.5 py-1 text-[#008F83] dark:text-[#32D5C4] hover:bg-[#008F83]/10 dark:hover:bg-[#008F83]/20 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditTenant(params.data);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];
}

