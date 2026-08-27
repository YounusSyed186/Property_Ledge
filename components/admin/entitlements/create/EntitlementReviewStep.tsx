'use client';

import React from 'react';
import {
  getKindLabel,
  getEntitlementKind,
  getTypeDisplayLabel,
  type SupportedEntitlementDefinition,
} from '@/lib/entitlements/capability-catalog';

interface EntitlementReviewStepProps {
  name: string;
  description: string;
  key: string;
  valueType: 'boolean' | 'number';
  capability?: SupportedEntitlementDefinition | null;
  isCustom?: boolean;
}

export function EntitlementReviewStep({
  name,
  description,
  key,
  valueType,
  capability,
  isCustom,
}: EntitlementReviewStepProps) {
  const kind = capability?.kind ?? getEntitlementKind(valueType);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-admin-muted">Review entitlement</p>
        <h3 className="text-lg font-semibold text-admin-foreground mt-1">{name}</h3>
        <p className="text-sm text-admin-muted mt-1">{description}</p>
      </div>

      <div className="rounded-xl border border-admin-border divide-y divide-admin-border">
        <div className="p-3 flex justify-between text-sm">
          <span className="text-admin-muted">Type</span>
          <span className="font-medium">{getKindLabel(kind)}</span>
        </div>
        {isCustom && (
          <div className="p-3 flex justify-between text-sm">
            <span className="text-admin-muted">Source</span>
            <span className="font-medium">Custom entitlement</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-admin-border p-3 space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-admin-muted">Advanced</p>
        <div className="flex justify-between text-sm gap-4">
          <span className="text-admin-muted shrink-0">Machine key</span>
          <code className="font-mono text-xs text-admin-foreground text-right break-all">{key}</code>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-admin-muted">Value type</span>
          <span>{getTypeDisplayLabel(valueType)}</span>
        </div>
      </div>

      <p className="text-xs text-admin-muted rounded-lg bg-admin-muted/10 p-3">
        This entitlement can now be assigned values when configuring subscription plans.
      </p>
    </div>
  );
}
