'use client';

import React, { useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Badge, Button } from '@/components/admin/ui';
import {
  CAPABILITY_CATEGORIES,
  searchCapabilities,
  getTypeDisplayLabel,
  type SupportedEntitlementDefinition,
  type CapabilityCategory,
} from '@/lib/entitlements/capability-catalog';
import type { AdminEntitlementRow } from '@/lib/admin/types';

interface CapabilityCatalogStepProps {
  existingEntitlements: AdminEntitlementRow[];
  onSelect: (cap: SupportedEntitlementDefinition) => void;
  onCustom: () => void;
  onViewExisting: (row: AdminEntitlementRow) => void;
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function CapabilityCatalogStep({
  existingEntitlements,
  onSelect,
  onCustom,
  onViewExisting,
}: CapabilityCatalogStepProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CapabilityCategory | 'All'>('All');
  const debouncedSearch = useDebouncedValue(search);

  const existingByKey = useMemo(
    () => new Map(existingEntitlements.map((e) => [e.key, e])),
    [existingEntitlements]
  );

  const capabilities = useMemo(
    () => searchCapabilities(debouncedSearch, category),
    [debouncedSearch, category]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SupportedEntitlementDefinition[]>();
    capabilities.forEach((cap) => {
      const list = map.get(cap.category);
      if (list) list.push(cap);
      else map.set(cap.category, [cap]);
    });
    return map;
  }, [capabilities]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-admin-primary/30 bg-admin-primary/5 p-4">
        <p className="text-sm font-medium text-admin-foreground">Supported capability</p>
        <p className="text-xs text-admin-muted mt-1">
          Start with a PropertyLedge capability or limit. Recommended for most administrators.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search capabilities..."
          className="w-full rounded-lg border border-admin-border bg-admin-surface pl-9 pr-3 py-2 text-sm"
          aria-label="Search capabilities"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CAPABILITY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-admin-primary text-black'
                : 'bg-admin-muted/20 text-admin-muted hover:text-admin-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {capabilities.length === 0 ? (
        <p className="text-sm text-admin-muted text-center py-8">No capabilities found. Try another search.</p>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-admin-muted mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map((cap) => {
                  const existing = existingByKey.get(cap.key);
                  return (
                    <div
                      key={cap.key}
                      className={`rounded-xl border p-4 transition-colors ${
                        existing
                          ? 'border-admin-border bg-admin-muted/10 opacity-90'
                          : 'border-admin-border hover:border-admin-primary/40 cursor-pointer'
                      }`}
                      onClick={() => !existing && onSelect(cap)}
                      onKeyDown={(e) => e.key === 'Enter' && !existing && onSelect(cap)}
                      role={existing ? undefined : 'button'}
                      tabIndex={existing ? undefined : 0}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-admin-foreground">{cap.displayName}</p>
                            {existing && (
                              <Badge variant="neutral" size="sm">Already configured</Badge>
                            )}
                          </div>
                          <p className="text-xs text-admin-muted mt-1">{cap.shortDescription}</p>
                          <p className="text-[10px] text-admin-muted/80 mt-1.5">{getTypeDisplayLabel(cap.valueType)}</p>
                          {existing && (
                            <p className="text-xs text-admin-muted mt-2">
                              Used by {existing.planCount} plan{existing.planCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        {existing ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewExisting(existing);
                            }}
                          >
                            View entitlement
                          </Button>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-admin-muted shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-admin-border pt-4">
        <div className="rounded-xl border border-admin-border p-4">
          <p className="text-sm font-medium text-admin-foreground">Custom entitlement</p>
          <p className="text-xs text-admin-muted mt-1">For advanced platform configuration.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={onCustom}>
            Create custom entitlement
          </Button>
        </div>
      </div>
    </div>
  );
}
