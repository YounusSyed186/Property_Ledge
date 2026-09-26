'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ArrowUpRight, Plus, MapPin } from 'lucide-react';
import type { UserPropertyAccess } from '@/lib/properties/queries';
import { cn } from '@/lib/utils';

interface PropertiesOverviewCardProps {
  properties: UserPropertyAccess[];
  leases?: Array<{ id: string; property_id?: string; status: string; rent_amount?: number }>;
  className?: string;
}

export function PropertiesOverviewCard({
  properties,
  leases = [],
  className,
}: PropertiesOverviewCardProps) {
  if (properties.length === 0) {
    return null;
  }

  // Group active leases by property
  const activeLeasesByProperty = new Map<string, number>();
  for (const lease of leases) {
    if (lease.status === 'active' && lease.property_id) {
      activeLeasesByProperty.set(
        lease.property_id,
        (activeLeasesByProperty.get(lease.property_id) || 0) + 1
      );
    }
  }

  return (
    <div className={cn('rounded-xl border border-admin-border bg-admin-surface overflow-hidden shadow-xs', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-admin-border/80 px-5 py-4 bg-admin-surface-subtle/50">
        <div>
          <h2 className="text-base font-semibold text-admin-foreground tracking-tight">
            Properties Portfolio
          </h2>
          <p className="text-body-sm text-admin-muted mt-0.5">Managed assets across this workspace</p>
        </div>
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-primary hover:text-admin-primary-hover hover:underline transition-colors min-h-[36px] px-3 py-1.5 rounded-lg hover:bg-admin-primary-soft/50"
        >
          <span>View All ({properties.length})</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-admin-border/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-admin-surface-subtle/30">
              <th className="py-3.5 px-5">Property</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4 text-center">Active Leases</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/60">
            {properties.slice(0, 5).map((property) => {
              const activeLeaseCount = activeLeasesByProperty.get(property.propertyId) ?? (property.role ? 1 : 0);
              const isOccupied = activeLeaseCount > 0;

              return (
                <tr
                  key={property.propertyId}
                  className="hover:bg-admin-surface-subtle/50 transition-colors group"
                >
                  <td className="py-3.5 px-5 font-medium text-admin-foreground">
                    <Link
                      href={`/dashboard/properties/${property.propertyId}`}
                      className="flex items-center gap-3 hover:text-admin-primary transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-admin-primary-soft flex items-center justify-center shrink-0 border border-admin-primary/20 text-admin-primary">
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-admin-foreground truncate leading-tight group-hover:text-admin-primary transition-colors text-body-sm">
                          {property.propertyName}
                        </p>
                        {property.organizationName && (
                          <p className="text-caption text-admin-muted truncate mt-0.5">
                            {property.organizationName}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-admin-surface-subtle text-slate-600 dark:text-slate-300 border border-admin-border capitalize">
                      {property.role || 'Member'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="text-body-sm font-bold tabular-nums text-admin-foreground">
                      {activeLeaseCount}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                      isOccupied
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                    )}>
                      <span className={cn('h-2 w-2 rounded-full', isOccupied ? 'bg-emerald-500' : 'bg-amber-500')} />
                      {isOccupied ? 'Active' : 'Vacant'}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <Link
                      href={`/dashboard/properties/${property.propertyId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-admin-primary hover:text-admin-primary-hover hover:underline transition-colors min-h-[32px] px-2.5 py-1 rounded-md hover:bg-admin-primary-soft/40"
                    >
                      <span>Manage</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {properties.length > 5 && (
        <div className="p-3 border-t border-admin-border/80 bg-admin-surface-subtle/30 text-center">
          <Link
            href="/dashboard/properties"
            className="text-xs sm:text-body-sm font-semibold text-admin-primary hover:underline inline-flex items-center gap-1"
          >
            <span>View all {properties.length} properties in portfolio</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
