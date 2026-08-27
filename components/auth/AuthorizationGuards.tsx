'use client';

import React from 'react';
import { useCan, useCanAndEntitled, useEntitled } from '@/lib/auth/client-permissions';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = useCan(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

interface EntitledProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Entitled({ feature, children, fallback = null }: EntitledProps) {
  const allowed = useEntitled(feature);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

interface CanAndEntitledProps {
  permission: string;
  entitlement: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAndEntitled({ permission, entitlement, children, fallback = null }: CanAndEntitledProps) {
  const allowed = useCanAndEntitled(permission, entitlement);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
