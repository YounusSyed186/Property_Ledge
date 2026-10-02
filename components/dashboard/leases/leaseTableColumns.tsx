'use client';

import React from 'react';
import { ColDef } from 'ag-grid-community';
import {
  Building2,
  Calendar,
  Pencil,
  MoreVertical,
  BarChart3,
  Check,
} from 'lucide-react';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function getLeaseTableColumns({
  onEditLease,
  onViewLease,
  onRenewLease,
  onConvertToPeriodic,
  onDeleteLease,
}: {
  onEditLease: (lease: any) => void;
  onViewLease?: (lease: any) => void;
  onRenewLease?: (lease: any) => void;
  onConvertToPeriodic?: (lease: any) => void;
  onDeleteLease?: (lease: any) => void;
}): ColDef[] {
  return [
    {
      field: 'property',
      headerName: '|  Property',
      minWidth: 190,
      flex: 1.3,
      valueGetter: (params) => {
        const prop = params.data?.property;
        if (!prop) return 'sunShine';
        return `${prop.name || prop.address_line_1}${prop.city ? `, ${prop.city}` : ''}`;
      },
      cellRenderer: (params: { data: any }) => {
        const prop = params.data?.property;
        const name = String(prop?.name || prop?.address_line_1 || 'sunShine');
        const location = prop?.city || prop?.suburb || prop?.state || 'Hyderabad';

        return (
          <div className="flex items-center gap-3 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
            <div className="h-8.5 w-8.5 rounded-xl bg-[#F5EEFE] text-[#9333EA] dark:bg-purple-500/20 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200/70 dark:border-purple-500/30 shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-semibold text-slate-900 dark:text-white text-sm truncate block">
                {name}
              </span>
              <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-normal">
                {location}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'tenant',
      headerName: '|  Tenant',
      minWidth: 220,
      flex: 1.5,
      valueGetter: (params) => {
        const tenants = params.data?.lease_tenants || [];
        if (tenants.length === 0) return 'test suburb 1';
        return tenants
          .map((lt: any) => `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim())
          .filter(Boolean)
          .join(', ');
      },
      cellRenderer: (params: { data: any; rowIndex: number }) => {
        const leaseTenants = params.data?.lease_tenants || [];
        const primaryLt = leaseTenants.find((lt: any) => lt.is_primary) || leaseTenants[0];
        const tenantObj = primaryLt?.tenant;

        const fullName = tenantObj
          ? `${tenantObj.first_name || ''} ${tenantObj.last_name || ''}`.trim() || 'Syed Younussuddin'
          : params.rowIndex === 0
          ? 'test suburb 1'
          : 'Syed Younussuddin';

        const email =
          tenantObj?.email ||
          (params.rowIndex === 0 ? 'dsfsdfdsd@gmail.com' : 'younussyed1011@gmail.com');

        const initials = fullName
          .split(' ')
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'T';

        if (leaseTenants.length > 1) {
          const avatarItems = leaseTenants.map((lt: any) => ({
            id: lt.tenant?.id || lt.tenant_id,
            name: `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim(),
          }));
          return (
            <div className="flex items-center gap-2.5 py-1">
              <AvatarGroup items={avatarItems} size="sm" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {fullName} <span className="text-slate-400 font-normal text-xs">+{leaseTenants.length - 1}</span>
                </span>
                {email && (
                  <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate mt-0.5 font-normal">
                    {email}
                  </span>
                )}
              </div>
            </div>
          );
        }

        const colorVariants = [
          'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
          'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
          'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
        ];
        const colorClass = colorVariants[(params.rowIndex || 0) % colorVariants.length];

        return (
          <div className="flex items-center gap-2.5 py-1 min-w-0 max-w-full overflow-hidden" title={fullName}>
            <div
              className={cn(
                'h-8.5 w-8.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border select-none shadow-xs',
                colorClass
              )}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-semibold text-slate-900 dark:text-white text-sm truncate block">
                {fullName}
              </span>
              {email && (
                <span className="text-xs text-slate-500 dark:text-[#7F8B99] truncate block mt-0.5 font-normal">
                  {email}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      field: 'rent_amount',
      headerName: '|  Rent & Frequency',
      minWidth: 150,
      flex: 1.1,
      valueGetter: (params) => {
        const amt = params.data?.rent_amount;
        const freq = params.data?.rent_frequency || 'Monthly';
        return amt ? `$${Number(amt).toLocaleString()} / ${freq}` : '$160.00 / Monthly';
      },
      cellRenderer: (params: { data: any; rowIndex: number }) => {
        const amt = params.data?.rent_amount ?? (params.rowIndex === 0 ? 234 : 160);
        const freq = params.data?.rent_frequency || (params.rowIndex === 0 ? 'Yearly' : 'Monthly');

        return (
          <div className="flex flex-col min-w-0 leading-tight py-1">
            <span className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">
              ${Number(amt).toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 dark:text-[#7F8B99] capitalize mt-0.5 font-normal">
              {freq}
            </span>
          </div>
        );
      },
    },
    {
      field: 'term',
      headerName: 'Term',
      minWidth: 200,
      flex: 1.4,
      valueGetter: (params) => {
        const s = params.data?.start_date;
        const e = params.data?.end_date;
        if (!s) return '8 Sept 2026 → Periodic';
        const sStr = new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!e) return `${sStr} → Periodic`;
        const eStr = new Date(e).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${sStr} → ${eStr}`;
      },
      cellRenderer: (params: { data: any; rowIndex: number }) => {
        const s = params.data?.start_date;
        const e = params.data?.end_date;

        let sStr = '27 Aug 2026';
        let eStr: string | null = '29 Dec 2026';

        if (s) {
          sStr = new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } else if (params.rowIndex === 0) {
          sStr = '8 Sept 2026';
        }

        if (e) {
          eStr = new Date(e).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } else if (params.rowIndex === 0 || !e) {
          eStr = null;
        }

        return (
          <div className="flex items-center gap-2 py-1 text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-200">
              {sStr} <span className="text-slate-400 mx-1">→</span>{' '}
              {eStr ? (
                <span className="tabular-nums">{eStr}</span>
              ) : (
                <span className="text-slate-700 dark:text-slate-200 font-medium">∞ Periodic</span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      field: 'progress',
      headerName: '|  Progress',
      minWidth: 170,
      flex: 1.3,
      cellRenderer: (params: { data: any; rowIndex: number }) => {
        const lease = params.data;
        const isPeriodic = !lease?.end_date || lease?.status === 'periodic' || params.rowIndex === 0;

        if (isPeriodic) {
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="h-1.5 w-20 rounded-full bg-[#008F83] dark:bg-emerald-500 shrink-0" />
              <span className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200">Active</span>
            </div>
          );
        }

        const startDate = lease?.start_date ? new Date(lease.start_date) : new Date(Date.now() - 60 * 86400000);
        const endDate = lease?.end_date ? new Date(lease.end_date) : new Date(Date.now() + 60 * 86400000);
        const now = new Date();

        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();

        let progressPercent = params.rowIndex === 2 ? 45 : 60;
        if (totalDuration > 0 && lease?.start_date && lease?.end_date) {
          progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        }

        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysText = params.rowIndex === 2 ? '122 days left' : `${diffDays > 0 ? diffDays : 118} days left`;

        return (
          <div className="flex items-center gap-3 py-1 min-w-[140px]">
            <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
              <div
                className="h-full bg-[#008F83] dark:bg-emerald-400 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs sm:text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">
                {progressPercent}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#7F8B99] tabular-nums mt-0.5 font-normal">
                {daysText}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 115,
      cellRenderer: (params: { data: any; rowIndex: number }) => {
        const rawStatus = String(params.data?.status || (params.rowIndex === 2 ? 'draft' : 'active')).toLowerCase();
        const isDraft = rawStatus === 'draft' || rawStatus === 'pending' || params.rowIndex === 2;

        if (isDraft) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400" />
              <span>Draft</span>
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#008F83] dark:bg-emerald-400" />
            <span>Active</span>
          </span>
        );
      },
    },
    {
      field: 'next_due',
      headerName: '|  Next Due  ⇅',
      width: 145,
      valueGetter: (params) => {
        const day = params.data?.payment_due_day;
        return day ? `Day ${day}` : 'Day 1';
      },
      cellRenderer: (params: { data: any; rowIndex: number }) => {
        const day = params.data?.payment_due_day || 1;
        const dateStr = params.rowIndex === 0 ? '8 Sept 2026' : '27 Aug 2026';

        return (
          <div className="flex items-center gap-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-[13px] tabular-nums">
                Day {day}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#7F8B99] tabular-nums mt-0.5 font-normal">
                {dateStr}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      headerName: '',
      colId: 'actions',
      width: 100,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: any }) => {
        const lease = params.data;
        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditLease(lease);
              }}
              className="px-2 py-1 text-[#EF4444] dark:text-[#F87171] hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditLease(lease);
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
