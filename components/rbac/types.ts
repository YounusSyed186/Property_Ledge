export interface PermissionItem {
  key: string;
  name: string;
  resource: string;
  action: string;
  scope?: string;
  description?: string | null;
}

export interface MatrixRole {
  id: string;
  name: string;
  description?: string | null;
  isSystemRole?: boolean;
  isEditable?: boolean;
  permissionCount?: number;
  memberCount?: number;
  workspaceCount?: number;
}

export type PermissionStatusFilter = 'all' | 'enabled' | 'disabled';

export interface ActionDefinition {
  action: string;
  label: string;
  description?: string;
}

export interface ResourceGroupData {
  resource: string;
  label: string;
  description?: string;
  category: string;
  permissions: PermissionItem[];
  actionsMap: Map<string, PermissionItem>;
  totalCount: number;
  enabledCount: number;
  grantableCount: number;
}
