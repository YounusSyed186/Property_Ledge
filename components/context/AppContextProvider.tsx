'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { PropertyProvider } from '@/components/property/PropertyContext';
import { PermissionContext } from '@/lib/auth/client-permissions';
import type { EntitlementMap } from '@/types/subscriptions';
import type { Persona } from '@/lib/auth/permissions';

const WORKSPACE_STORAGE_KEY = 'selectedWorkspaceId';

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
}

export function AppContextProvider({
  children,
  persona,
  workspaceId: initialWorkspaceId = null,
  workspaceName = null,
  roleName = null,
  permissions = [],
  entitlements = {},
}: AppContextProviderProps) {
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(initialWorkspaceId);

  useEffect(() => {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored) {
      setWorkspaceIdState(stored);
    } else if (initialWorkspaceId) {
      setWorkspaceIdState(initialWorkspaceId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, initialWorkspaceId);
    }
  }, [initialWorkspaceId]);

  const setWorkspaceId = useCallback((id: string | null) => {
    setWorkspaceIdState(id);
    if (id) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WORKSPACE_STORAGE_KEY) {
        setWorkspaceIdState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AppContext.Provider
      value={{ persona, workspaceId, setWorkspaceId, permissions, workspaceName, roleName }}
    >
      <PermissionContext.Provider value={{ permissions, platformPermissions: [], entitlements }}>
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
