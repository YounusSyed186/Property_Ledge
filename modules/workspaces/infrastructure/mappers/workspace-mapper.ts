/**
 * Workspace Data Mapper.
 */

import { Database } from '@/types/database';
import { Workspace } from '../../domain/entities/workspace';

type WorkspaceRow = Database['public']['Tables']['workspaces']['Row'];

export function mapWorkspaceRowToDomain(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.owner_id,
    status: row.status,
    avatarUrl: (row as { avatar_url?: string | null }).avatar_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
