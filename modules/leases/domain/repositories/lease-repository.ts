/**
 * Lease Repository Interface.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Lease, LeaseFilters, LeaseStatus, RentFrequency, LeaseTenantAssignment } from '../entities/lease';

export interface CreateLeaseData {
  propertyId: string;
  unitId?: string | null;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  securityDeposit?: number;
  paymentDueDay?: number;
  rentFrequency?: RentFrequency;
  notes?: string | null;
  status?: LeaseStatus;
  tenantAssignments?: Array<{
    tenantId: string;
    role?: 'primary' | 'co-tenant' | 'guarantor';
    isPrimary?: boolean;
  }>;
}

export type UpdateLeaseData = Partial<Omit<CreateLeaseData, 'propertyId'>>;

export interface LeaseRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Lease, DomainError>>;
  listByProperty(propertyId: string, context?: RequestContext): Promise<Result<Lease[], DomainError>>;
  listByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<Lease[], DomainError>>;
  list(filters: LeaseFilters, context?: RequestContext): Promise<Result<Lease[], DomainError>>;
  create(data: CreateLeaseData, context: RequestContext): Promise<Result<Lease, DomainError>>;
  update(id: string, data: UpdateLeaseData, context: RequestContext): Promise<Result<Lease, DomainError>>;
  archive(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
  restore(id: string, context: RequestContext): Promise<Result<Lease, DomainError>>;
  delete(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
  getLeaseTenants(leaseId: string, context?: RequestContext): Promise<Result<LeaseTenantAssignment[], DomainError>>;
}
