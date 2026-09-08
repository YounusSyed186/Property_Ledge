/**
 * Workspace Repository Interface.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Workspace, WorkspaceMemberInfo, UserWorkspaceSummary } from '../entities/workspace';

export interface WorkspaceRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Workspace, DomainError>>;
  listForUser(userId: string, context?: RequestContext): Promise<Result<UserWorkspaceSummary[], DomainError>>;
  getMembership(workspaceId: string, userId: string, context?: RequestContext): Promise<Result<WorkspaceMemberInfo | null, DomainError>>;
  update(id: string, data: Partial<Pick<Workspace, 'name' | 'slug' | 'avatarUrl' | 'status'>>, context: RequestContext): Promise<Result<Workspace, DomainError>>;
}
