/**
 * Tenant Repository Interface.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Tenant, TenantFilters, TenantStatus } from '../entities/tenant';

export interface CreateTenantData {
  propertyId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  status?: TenantStatus;
}

export type UpdateTenantData = Partial<Omit<CreateTenantData, 'propertyId'>>;

export interface TenantRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Tenant, DomainError>>;
  listByProperty(propertyId: string, context?: RequestContext): Promise<Result<Tenant[], DomainError>>;
  listByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<Tenant[], DomainError>>;
  list(filters: TenantFilters, context?: RequestContext): Promise<Result<Tenant[], DomainError>>;
  create(data: CreateTenantData, context: RequestContext): Promise<Result<Tenant, DomainError>>;
  update(id: string, data: UpdateTenantData, context: RequestContext): Promise<Result<Tenant, DomainError>>;
  archive(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
  restore(id: string, context: RequestContext): Promise<Result<Tenant, DomainError>>;
  delete(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
}
