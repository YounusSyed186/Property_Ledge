'use client';

import { create } from 'zustand';
import type { EntitlementMap } from '@/types/subscriptions';

export interface AccessibleWorkspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

export interface WorkspaceBootstrap {
  activeWorkspaceId: string | null;
  workspaceName: string | null;
  roleName: string | null;
  permissions: string[];
  entitlements: EntitlementMap;
  workspaces?: AccessibleWorkspace[];
}

interface WorkspaceState extends WorkspaceBootstrap {
  workspaces: AccessibleWorkspace[];
  isSwitching: boolean;
  hydrate: (data: WorkspaceBootstrap) => void;
  updateFromServer: (data: Partial<WorkspaceBootstrap>) => void;
  setWorkspaces: (workspaces: AccessibleWorkspace[]) => void;
  setSwitching: (value: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  workspaceName: null,
  roleName: null,
  permissions: [],
  entitlements: {},
  workspaces: [],
  isSwitching: false,

  hydrate: (data) =>
    set({
      activeWorkspaceId: data.activeWorkspaceId,
      workspaceName: data.workspaceName,
      roleName: data.roleName,
      permissions: data.permissions,
      entitlements: data.entitlements,
      workspaces: data.workspaces ?? [],
    }),

  updateFromServer: (data) =>
    set((state) => ({
      activeWorkspaceId: data.activeWorkspaceId ?? state.activeWorkspaceId,
      workspaceName: data.workspaceName ?? state.workspaceName,
      roleName: data.roleName ?? state.roleName,
      permissions: data.permissions ?? state.permissions,
      entitlements: data.entitlements ?? state.entitlements,
      workspaces: data.workspaces ?? state.workspaces,
    })),

  setWorkspaces: (workspaces) => set({ workspaces }),
  setSwitching: (isSwitching) => set({ isSwitching }),
}));
