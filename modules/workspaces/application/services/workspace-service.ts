/**
 * Workspace Application Service.
 * Pure Application Layer - ZERO Supabase imports.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, ValidationError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Workspace, WorkspaceMemberInfo, UserWorkspaceSummary } from '../../domain/entities/workspace';
import { WorkspaceRepository } from '../../domain/repositories/workspace-repository';

export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async getWorkspace(id: string, context?: RequestContext): Promise<Result<Workspace, DomainError>> {
    if (!id) {
      return err(new ValidationError('Workspace ID is required.'));
    }
    return this.repository.getById(id, context);
  }

  async listUserWorkspaces(userId: string, context?: RequestContext): Promise<Result<UserWorkspaceSummary[], DomainError>> {
    if (!userId) {
      return err(new ValidationError('User ID is required.'));
    }
    return this.repository.listForUser(userId, context);
  }

  async getMembership(workspaceId: string, userId: string, context?: RequestContext): Promise<Result<WorkspaceMemberInfo | null, DomainError>> {
    if (!workspaceId || !userId) {
      return err(new ValidationError('Workspace ID and User ID are required.'));
    }
    return this.repository.getMembership(workspaceId, userId, context);
  }

  async updateWorkspace(
    id: string,
    data: Partial<Pick<Workspace, 'name' | 'slug' | 'avatarUrl' | 'status'>>,
    context: RequestContext
  ): Promise<Result<Workspace, DomainError>> {
    if (!id) {
      return err(new ValidationError('Workspace ID is required.'));
    }
    return this.repository.update(id, data, context);
  }
}
