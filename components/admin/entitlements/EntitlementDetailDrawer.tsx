'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConfigDetailDrawer, ConfigDetailActions } from '@/components/admin/config';
import { Badge } from '@/components/admin/ui';
import { fetchAdminEntitlementDetail } from '@/app/actions/admin-config';
import { AdminConfigDrawerSkeleton } from '@/components/admin/config';
import {
  findCapabilityByKey,
  getEntitlementKind,
  getKindLabel,
  getTypeDisplayLabel,
  isSupportedCapabilityKey,
} from '@/lib/entitlements/capability-catalog';
import type { AdminEntitlementRow } from '@/lib/admin/types';

interface EntitlementDetailDrawerProps {
  entitlement: AdminEntitlementRow | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (entitlement: AdminEntitlementRow) => void;
  onDelete: (entitlement: AdminEntitlementRow) => void;
}

export function EntitlementDetailDrawer({
  entitlement,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: EntitlementDetailDrawerProps) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminEntitlementDetail>>>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !entitlement) return;
    setLoading(true);
    fetchAdminEntitlementDetail(entitlement.id)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [isOpen, entitlement?.id]);

  if (!entitlement) return null;

  const cap = findCapabilityByKey(entitlement.key);
  const kind = cap?.kind ?? getEntitlementKind(entitlement.value_type);

  return (
    <ConfigDetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={entitlement.name}
      description={entitlement.description || cap?.shortDescription || undefined}
      badge={
        isSupportedCapabilityKey(entitlement.key)
          ? { label: 'Supported capability', variant: 'info' }
          : { label: 'Custom entitlement', variant: 'neutral' }
      }
      sections={loading ? [] : [
        {
          label: 'Type',
          value: (
            <div className="space-y-1">
              <Badge variant="neutral" size="sm">{getKindLabel(kind)}</Badge>
              <p className="text-xs text-admin-muted">{getTypeDisplayLabel(entitlement.value_type)}</p>
            </div>
          ),
        },
        {
          label: 'Used by',
          value: `${detail?.planCount ?? entitlement.planCount} plan${(detail?.planCount ?? entitlement.planCount) !== 1 ? 's' : ''}`,
        },
        {
          label: 'Machine key',
          value: <code className="font-mono text-xs bg-admin-muted/20 px-2 py-1 rounded">{entitlement.key}</code>,
        },
        {
          label: 'Updated',
          value: new Date(entitlement.updated_at).toLocaleString(),
        },
      ]}
      footer={
        <div className="flex justify-between w-full gap-2">
          <ConfigDetailActions
            onDelete={() => onDelete(entitlement)}
            deleteLabel="Delete"
          />
          <div className="flex gap-2">
            {(detail?.planCount ?? entitlement.planCount) > 0 && (
              <Link href="/admin/plans">
                <Badge variant="neutral" size="sm" className="cursor-pointer hover:bg-admin-muted/30 px-3 py-1.5">
                  View plans
                </Badge>
              </Link>
            )}
            <button
              type="button"
              onClick={() => onEdit(entitlement)}
              className="px-3 py-1.5 rounded-lg bg-admin-primary text-black text-xs font-semibold"
            >
              Edit entitlement
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <AdminConfigDrawerSkeleton />
      ) : detail?.plans && detail.plans.length > 0 ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-admin-muted mb-2">Plan values</p>
          <p className="text-xs text-admin-muted mb-3">
            Each plan assigns a value to this entitlement. Plans control what customers receive.
          </p>
          <ul className="space-y-2">
            {detail.plans.map((plan: { id: string; name: string; displayValue: string }) => (
              <li key={plan.id} className="flex items-center justify-between rounded-lg border border-admin-border px-3 py-2 text-sm">
                <Link href={`/admin/plans/${plan.id}`} className="font-medium text-admin-primary hover:underline">
                  {plan.name}
                </Link>
                <span className="text-admin-muted tabular-nums">{plan.displayValue}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-admin-muted">Not assigned to any plans yet. Configure values on subscription plans.</p>
      )}
    </ConfigDetailDrawer>
  );
}
