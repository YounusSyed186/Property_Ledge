/**
 * Workspace Domain Entity.
 * Pure domain representation - zero Supabase dependencies.
 */

export type WorkspaceStatus = 'active' | 'archived' | 'suspended';

export interface WorkspaceMemberInfo {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'manager' | 'agent' | 'staff' | 'viewer';
  roleId?: string | null;
  roleName?: string | null;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  joinedAt?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: WorkspaceStatus;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  roleName: string | null;
  roleId: string | null;
  avatarUrl: string | null;
}
