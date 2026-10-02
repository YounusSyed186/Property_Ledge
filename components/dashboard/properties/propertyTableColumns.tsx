'use client';

import React from 'react';
import { ColDef } from 'ag-grid-community';
import { Building2, Building, Home, MapPin, MoreVertical, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getPropertiesTableColumns(onEditProperty: (property: Record<string, unknown>) => void): ColDef[] {
  return [
    {
      field: 'name',
      headerName: 'Property Name',
      minWidth: 230,
      flex: 1.5,
      valueGetter: (params) => params.data?.name || params.data?.address_line_1 || '—',
      cellRenderer: (params: { data: Record<string, unknown>; rowIndex: number }) => {
        const name = String(params.data?.name || params.data?.address_line_1 || 'Property');
        const isOdd = (params.rowIndex || 0) % 2 === 1;

        return (
          <div className="flex items-center gap-3 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border',
                isOdd
                  ? 'bg-orange-50 text-orange-500 border-orange-200/80 dark:bg-orange-500/15 dark:border-orange-500/30'
                  : 'bg-rose-50 text-rose-500 border-rose-200/80 dark:bg-rose-500/15 dark:border-rose-500/30'
              )}
            >
              {isOdd ? <BarChart3 className="w-4 h-4" /> : <Home className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13px] truncate block leading-tight">
                {name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'property_category',
      headerName: 'Category',
      width: 130,
      valueGetter: (params) => params.data?.property_category || 'Residential',
      cellRenderer: (params: { value: string }) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {params.value || 'Residential'}
        </span>
      ),
    },
    {
      field: 'property_type',
      headerName: 'Property Type',
      width: 150,
      valueGetter: (params) => params.data?.property_type || 'Apartment',
      cellRenderer: (params: { value: string }) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {params.value || 'Apartment'}
        </span>
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      minWidth: 200,
      flex: 1.3,
      valueGetter: (params) => {
        const suburb = params.data?.suburb || params.data?.city || '';
        const state = params.data?.state || '';
        const postcode = params.data?.postal_code || params.data?.postcode || '';
        const street = params.data?.address_line_1 || params.data?.address || '';
        const locality = [suburb, [state, postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        return locality || street || '—';
      },
      cellRenderer: (params: { value: string }) => (
        <div className="flex items-center gap-1.5 py-1 min-w-0" title={params.value}>
          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-[#7F8B99] shrink-0" />
          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
            {params.value}
          </span>
        </div>
      ),
    },
    {
      field: 'rent_amount',
      headerName: 'Rent',
      width: 125,
      valueGetter: (params) => {
        const amt = params.data?.rent_amount;
        if (!amt && amt !== 0) return '—';
        const freq = params.data?.payment_frequency
          ? `/${String(params.data.payment_frequency).toLowerCase().replace('weekly', 'wk').replace('monthly', 'mo')}`
          : '/wk';
        return `$${Number(amt).toLocaleString()}${freq}`;
      },
      cellRenderer: (params: { value: string }) => (
        <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
          {params.value}
        </span>
      ),
    },
    {
      field: 'bedrooms',
      headerName: 'Beds',
      width: 80,
      valueGetter: (params) =>
        params.data?.bedrooms !== undefined && params.data?.bedrooms !== null && params.data?.bedrooms !== ''
          ? params.data?.bedrooms
          : '—',
      cellRenderer: (params: { value: any }) => (
        <span className="text-xs text-slate-600 dark:text-[#94A3B8] tabular-nums">
          {String(params.value ?? '—')}
        </span>
      ),
    },
    {
      field: 'bathrooms',
      headerName: 'Baths',
      width: 80,
      valueGetter: (params) =>
        params.data?.bathrooms !== undefined && params.data?.bathrooms !== null && params.data?.bathrooms !== ''
          ? params.data?.bathrooms
          : '—',
      cellRenderer: (params: { value: any }) => (
        <span className="text-xs text-slate-600 dark:text-[#94A3B8] tabular-nums">
          {String(params.value ?? '—')}
        </span>
      ),
    },
    {
      field: 'parking_spaces',
      headerName: 'Parking',
      width: 90,
      valueGetter: (params) =>
        params.data?.parking_spaces !== undefined && params.data?.parking_spaces !== null
          ? params.data?.parking_spaces
          : params.data?.car_spaces ?? '—',
      cellRenderer: (params: { value: any }) => (
        <span className="text-xs text-slate-600 dark:text-[#94A3B8] tabular-nums">
          {String(params.value ?? '—')}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      cellRenderer: (params: { data: Record<string, unknown> }) => {
        const status = String(params.data?.status || 'active').toLowerCase();
        const isActive = status === 'active';
        const isDraft = status === 'draft' || status === 'pending';

        return (
          <div className="flex items-center h-full">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20'
                  : isDraft
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20'
                  : 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isActive ? 'bg-emerald-500' : isDraft ? 'bg-amber-500' : 'bg-slate-400'
                )}
              />
              <span className="capitalize">{String(params.data?.status || 'Active')}</span>
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 80,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Record<string, unknown> }) => (
        <div className="flex items-center justify-center h-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditProperty(params.data);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors"
            title="Edit property"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];
}
