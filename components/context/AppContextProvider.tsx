'use client';

import React, { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { PropertyProvider } from '@/components/property/PropertyContext';
import { PermissionContext } from '@/lib/auth/client-permissions';
import { useWorkspaceStore, type AccessibleWorkspace } from '@/lib/stores/useWorkspaceStore';
import type { EntitlementMap } from '@/types/subscriptions';
import type { Persona } from '@/lib/auth/permissions';

interface AppContextValue {
  persona: Persona;
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string | null) => void;
  permissions: string[];
  workspaceName: string | null;
  roleName: string | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
  persona: Persona;
  workspaceId?: string | null;
  workspaceName?: string | null;
  roleName?: string | null;
  permissions?: string[];
  entitlements?: EntitlementMap;
  workspaces?: AccessibleWorkspace[];
}

export function AppContextProvider({
  children,
  persona,
  workspaceId: initialWorkspaceId = null,
  workspaceName = null,
  roleName = null,
  permissions = [],
  entitlements = {},
  workspaces = [],
}: AppContextProviderProps) {
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const storeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const storePermissions = useWorkspaceStore((s) => s.permissions);
  const storeWorkspaceName = useWorkspaceStore((s) => s.workspaceName);
  const storeRoleName = useWorkspaceStore((s) => s.roleName);
  const storeEntitlements = useWorkspaceStore((s) => s.entitlements);
  const updateFromServer = useWorkspaceStore((s) => s.updateFromServer);

  useEffect(() => {
    hydrate({
      activeWorkspaceId: initialWorkspaceId,
      workspaceName,
      roleName,
      permissions,
      entitlements,
      workspaces,
    });
  }, [initialWorkspaceId, workspaceName, roleName, permissions, entitlements, workspaces, hydrate]);

  const setWorkspaceId = useCallback(
    (id: string | null) => {
      updateFromServer({ activeWorkspaceId: id });
    },
    [updateFromServer]
  );

  const workspaceId = storeWorkspaceId ?? initialWorkspaceId;
  const effectivePermissions = storePermissions.length > 0 ? storePermissions : permissions;
  const effectiveWorkspaceName = storeWorkspaceName ?? workspaceName;
  const effectiveRoleName = storeRoleName ?? roleName;
  const effectiveEntitlements =
    Object.keys(storeEntitlements).length > 0 ? storeEntitlements : entitlements;

  return (
    <AppContext.Provider
      value={{
        persona,
        workspaceId,
        setWorkspaceId,
        permissions: effectivePermissions,
        workspaceName: effectiveWorkspaceName,
        roleName: effectiveRoleName,
      }}
    >
      <PermissionContext.Provider
        value={{ permissions: effectivePermissions, platformPermissions: [], entitlements: effectiveEntitlements }}
      >
        <PropertyProvider>{children}</PropertyProvider>
      </PermissionContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}
