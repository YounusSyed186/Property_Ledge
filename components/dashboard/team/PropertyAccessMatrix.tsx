'use client';

import React, { useState } from 'react';
import { Building2, UserPlus } from 'lucide-react';
import { Button, Select, useToast } from '@/components/admin/ui';
import { invitePropertyMember } from '@/app/actions/team';

export interface PropertyAccessRow {
  propertyId: string;
  propertyName: string;
  members: Array<{
    id: string;
    email: string;
    fullName?: string | null;
    role: string;
    status: string;
  }>;
}

interface PropertyAccessMatrixProps {
  properties: PropertyAccessRow[];
  onInvited?: () => void;
}

const propertyRoleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
];

export function PropertyAccessMatrix({ properties, onInvited }: PropertyAccessMatrixProps) {
  const { success, error: showError } = useToast();
  const [pending, setPending] = useState<Record<string, { email: string; role: string }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const updatePending = (propertyId: string, patch: Partial<{ email: string; role: string }>) => {
    setPending((prev) => {
      const current = prev[propertyId] ?? { email: '', role: 'viewer' };
      return {
        ...prev,
        [propertyId]: { ...current, ...patch },
      };
    });
  };

  const handleInvite = async (propertyId: string) => {
    const draft = pending[propertyId];
    if (!draft?.email?.trim()) return;

    setSubmittingId(propertyId);
    try {
      await invitePropertyMember(
        propertyId,
        draft.email.trim(),
        draft.role as 'manager' | 'agent' | 'staff' | 'viewer'
      );
      success('Property invite sent', `Invitation sent for this property.`);
      updatePending(propertyId, { email: '' });
      onInvited?.();
    } catch (err) {
      showError('Invite failed', err instanceof Error ? err.message : 'Could not send invitation.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-admin-border p-8 text-center text-sm text-admin-muted">
        No properties in this workspace yet. Add a property to manage per-property access.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((property) => {
        const draft = pending[property.propertyId] || { email: '', role: 'viewer' };

        return (
          <div key={property.propertyId} className="rounded-xl border border-admin-border bg-admin-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-admin-border bg-admin-muted/20">
              <Building2 className="h-4 w-4 text-admin-primary" />
              <h3 className="text-sm font-semibold text-admin-foreground">{property.propertyName}</h3>
              <span className="text-xs text-admin-muted ml-auto">
                {property.members.length} member{property.members.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-admin-border">
              {property.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-admin-foreground">
                      {member.fullName || member.email}
                    </p>
                    {member.fullName && (
                      <p className="text-xs text-admin-muted">{member.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs capitalize text-admin-muted">{member.role}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        member.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 bg-admin-muted/10">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => updatePending(property.propertyId, { email: e.target.value })}
                  placeholder="Invite by email"
                  className="flex-1 rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                />
                <Select
                  value={draft.role}
                  onChange={(e) => updatePending(property.propertyId, { role: e.target.value })}
                  className="sm:w-36"
                >
                  {propertyRoleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  disabled={submittingId === property.propertyId}
                  onClick={() => handleInvite(property.propertyId)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
