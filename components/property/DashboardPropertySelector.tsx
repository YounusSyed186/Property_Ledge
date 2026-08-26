'use client';

import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserPropertyAccess {
  propertyId: string;
  propertyName: string;
  role: 'owner' | 'manager' | 'agent' | 'staff' | 'viewer';
  status: 'invited' | 'active' | 'suspended' | 'removed';
  organizationId: string;
  organizationName: string;
}

interface DashboardPropertySelectorProps {
  properties: UserPropertyAccess[];
}

export function DashboardPropertySelector({ properties }: DashboardPropertySelectorProps) {
  if (properties.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 text-muted-foreground">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">No Properties</span>
        <ChevronDown className="w-4 h-4" />
      </div>
    );
  }

  // For now, just show the first property name - the full selector is in the sidebar
  const primaryProperty = properties.find(p => p.role === 'owner') || properties[0];

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
      <Building2 className="w-4 h-4 text-accent" />
      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{primaryProperty.propertyName}</span>
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}