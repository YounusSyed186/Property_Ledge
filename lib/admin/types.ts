export interface AdminEntitlementRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  value_type: 'boolean' | 'number' | 'string';
  created_at: string;
  updated_at: string;
  planCount: number;
  planNames: string[];
}

export interface AdminPlatformRoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permission_count: number;
  user_count: number;
  updated_at: string;
}

export interface AdminSystemTeamRoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permission_count: number;
  member_count: number;
  workspace_count: number;
  updated_at: string;
}

export interface AdminActivityLogRow {
  id: string;
  workspace_id: string | null;
  property_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user: { full_name: string; email: string };
  property: { name: string };
  workspace: { name: string };
}

export interface PermissionCatalogItem {
  key: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
}
