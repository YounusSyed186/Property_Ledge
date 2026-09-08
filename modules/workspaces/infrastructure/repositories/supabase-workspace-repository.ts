/**
 * Supabase Implementation of WorkspaceRepository.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Workspace, WorkspaceMemberInfo, UserWorkspaceSummary } from '../../domain/entities/workspace';
import { WorkspaceRepository } from '../../domain/repositories/workspace-repository';
import { mapWorkspaceRowToDomain } from '../mappers/workspace-mapper';

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<Workspace, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return err(new NotFoundError('Workspace', id));
      }

      return ok(mapWorkspaceRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listForUser(userId: string, _context?: RequestContext): Promise<Result<UserWorkspaceSummary[], DomainError>> {
    try {
      const [ownedRes, memberRes] = await Promise.all([
        this.client
          .from('workspaces')
          .select('id, name, slug, status, avatar_url')
          .eq('owner_id', userId)
          .eq('status', 'active'),
        this.client
          .from('workspace_members')
          .select('workspace_id, role_id, team_roles(name), workspaces(id, name, slug, status, avatar_url)')
          .eq('user_id', userId)
          .eq('status', 'active'),
      ]);

      if (ownedRes.error) {
        return err(toSafeDomainError(ownedRes.error));
      }

      const map = new Map<string, UserWorkspaceSummary>();

      for (const ws of ownedRes.data || []) {
        const row = ws as { id: string; name: string; slug: string; status: string; avatar_url?: string | null };
        map.set(row.id, {
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          roleName: 'Owner',
          roleId: null,
          avatarUrl: row.avatar_url ?? null,
        });
      }

      for (const m of memberRes.data || []) {
        const row = m as unknown as {
          workspace_id: string;
          role_id: string | null;
          team_roles?: { name?: string } | Array<{ name?: string }> | null;
          workspaces?: { id: string; name: string; slug: string; status: string; avatar_url?: string | null } | Array<{ id: string; name: string; slug: string; status: string; avatar_url?: string | null }> | null;
        };
        const rawWs = row.workspaces;
        const ws = Array.isArray(rawWs) ? rawWs[0] : rawWs;
        if (!ws || ws.status !== 'active') continue;
        if (!map.has(ws.id)) {
          const rawRole = row.team_roles;
          const roleObj = Array.isArray(rawRole) ? rawRole[0] : rawRole;
          map.set(ws.id, {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            status: ws.status,
            roleName: roleObj?.name ?? null,
            roleId: row.role_id,
            avatarUrl: ws.avatar_url ?? null,
          });
        }
      }

      return ok(Array.from(map.values()));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getMembership(workspaceId: string, userId: string, _context?: RequestContext): Promise<Result<WorkspaceMemberInfo | null, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('workspace_members')
        .select('id, user_id, workspace_id, role, role_id, status, joined_at, team_roles(name)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return ok(null);
      }

      const row = data as {
        id: string;
        user_id: string;
        workspace_id: string;
        role: 'owner' | 'admin' | 'manager' | 'agent' | 'staff' | 'viewer';
        role_id: string | null;
        status: 'invited' | 'active' | 'suspended' | 'removed';
        joined_at: string | null;
        team_roles?: { name?: string } | null;
      };

      return ok({
        id: row.id,
        userId: row.user_id,
        workspaceId: row.workspace_id,
        role: row.role,
        roleId: row.role_id,
        roleName: row.team_roles?.name ?? null,
        status: row.status,
        joinedAt: row.joined_at,
      });
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(
    id: string,
    data: Partial<Pick<Workspace, 'name' | 'slug' | 'avatarUrl' | 'status'>>,
    _context: RequestContext
  ): Promise<Result<Workspace, DomainError>> {
    try {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) payload.name = data.name;
      if (data.slug !== undefined) payload.slug = data.slug;
      if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
      if (data.status !== undefined) payload.status = data.status;

      const { data: updated, error } = await this.client
        .from('workspaces')
        .update(payload as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapWorkspaceRowToDomain(updated));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
