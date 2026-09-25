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
      <div className="flex items-center justify-between gap-3 border-b border-admin-border/70 px-4 sm:px-5 py-3 bg-admin-surface-subtle/30">
        <div>
          <h2 className="text-xs sm:text-sm font-semibold text-admin-foreground tracking-tight">
            Properties Portfolio
          </h2>
          <p className="text-[11px] text-admin-muted">Managed assets across this workspace</p>
        </div>
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-admin-primary hover:text-admin-primary-hover hover:underline transition-colors"
        >
          <span>View All ({properties.length})</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-admin-border/60 text-[10px] font-semibold text-admin-muted uppercase tracking-wider bg-admin-surface-subtle/20">
              <th className="py-2.5 px-4 sm:px-5">Property</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3 text-center">Active Leases</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-4 sm:px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/50">
            {properties.slice(0, 5).map((property) => {
              const activeLeaseCount = activeLeasesByProperty.get(property.propertyId) ?? (property.role ? 1 : 0);
              const isOccupied = activeLeaseCount > 0;

              return (
                <tr
                  key={property.propertyId}
                  className="hover:bg-admin-surface-subtle/40 transition-colors group"
                >
                  <td className="py-3 px-4 sm:px-5 font-medium text-admin-foreground">
                    <Link
                      href={`/dashboard/properties/${property.propertyId}`}
                      className="flex items-center gap-2.5 hover:text-admin-primary transition-colors"
                    >
                      <div className="h-7 w-7 rounded-lg bg-admin-primary-soft flex items-center justify-center shrink-0 border border-admin-primary/20 text-admin-primary">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-admin-foreground truncate leading-tight group-hover:text-admin-primary transition-colors">
                          {property.propertyName}
                        </p>
                        {property.organizationName && (
                          <p className="text-[10px] text-admin-muted truncate mt-0.5">
                            {property.organizationName}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>

                  <td className="py-3 px-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-admin-surface-subtle text-admin-muted border border-admin-border capitalize">
                      {property.role || 'Member'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="text-xs font-semibold tabular-nums text-admin-foreground">
                      {activeLeaseCount}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                      isOccupied
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', isOccupied ? 'bg-emerald-500' : 'bg-amber-500')} />
                      {isOccupied ? 'Active' : 'Vacant'}
                    </span>
                  </td>

                  <td className="py-3 px-4 sm:px-5 text-right">
                    <Link
                      href={`/dashboard/properties/${property.propertyId}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-admin-muted hover:text-admin-primary transition-colors"
                    >
                      <span>Manage</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {properties.length > 5 && (
        <div className="p-2.5 border-t border-admin-border/70 bg-admin-surface-subtle/20 text-center">
          <Link
            href="/dashboard/properties"
            className="text-[11px] font-semibold text-admin-primary hover:underline"
          >
            View all {properties.length} properties in portfolio →
          </Link>
        </div>
      )}
    </div>
  );
}
