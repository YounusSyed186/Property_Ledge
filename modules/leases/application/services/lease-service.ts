/**
 * Lease Application Service.
 * Pure Application Layer - ZERO Supabase imports.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, ValidationError, ForbiddenError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Lease, LeaseFilters, LeaseTenantAssignment } from '../../domain/entities/lease';
import { LeaseRepository } from '../../domain/repositories/lease-repository';
import { CreateLeaseDTO, UpdateLeaseDTO, RenewLeaseDTO } from '../dto/lease-dto';

export class LeaseService {
  constructor(private readonly repository: LeaseRepository) {}

  async getLease(id: string, context?: RequestContext): Promise<Result<Lease, DomainError>> {
    if (!id) {
      return err(new ValidationError('Lease ID is required.'));
    }
    return this.repository.getById(id, context);
  }

  async listLeasesByProperty(propertyId: string, context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    if (!propertyId) {
      return err(new ValidationError('Property ID is required.'));
    }
    return this.repository.listByProperty(propertyId, context);
  }

  async listLeasesByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    if (!workspaceId) {
      return err(new ValidationError('Workspace ID is required.'));
    }
    return this.repository.listByWorkspace(workspaceId, context);
  }

  async listLeases(filters: LeaseFilters = {}, context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    return this.repository.list(filters, context);
  }

  async createLease(dto: CreateLeaseDTO, context: RequestContext): Promise<Result<Lease, DomainError>> {
    if (!dto.propertyId) {
      return err(new ValidationError('Property ID is required.'));
    }
    if (!dto.startDate) {
      return err(new ValidationError('Start date is required.'));
    }
    if (dto.rentAmount === undefined || dto.rentAmount < 0) {
      return err(new ValidationError('Valid rent amount is required.'));
    }

    const tenantAssignments = (dto.tenantIds || []).map((tid, idx) => ({
      tenantId: tid,
      role: (idx === 0 ? 'primary' : 'co-tenant') as 'primary' | 'co-tenant',
      isPrimary: idx === 0,
    }));

    return this.repository.create(
      {
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        rentAmount: dto.rentAmount,
        securityDeposit: dto.securityDeposit ?? 0,
        paymentDueDay: dto.paymentDueDay ?? 1,
        rentFrequency: dto.rentFrequency ?? 'monthly',
        notes: dto.notes,
        status: 'active',
        tenantAssignments,
      },
      context
    );
  }

  async updateLease(
    id: string,
    dto: UpdateLeaseDTO,
    context: RequestContext
  ): Promise<Result<Lease, DomainError>> {
    if (!id) {
      return err(new ValidationError('Lease ID is required.'));
    }

    const tenantAssignments = dto.tenantIds
      ? dto.tenantIds.map((tid, idx) => ({
          tenantId: tid,
          role: (idx === 0 ? 'primary' : 'co-tenant') as 'primary' | 'co-tenant',
          isPrimary: idx === 0,
        }))
      : undefined;

    return this.repository.update(
      id,
      {
        unitId: dto.unitId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        rentAmount: dto.rentAmount,
        securityDeposit: dto.securityDeposit,
        paymentDueDay: dto.paymentDueDay,
        rentFrequency: dto.rentFrequency,
        notes: dto.notes,
        status: dto.status,
        tenantAssignments,
      },
      context
    );
  }

  async archiveLease(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    if (!id) {
      return err(new ValidationError('Lease ID is required.'));
    }
    return this.repository.archive(id, context);
  }

  async restoreLease(id: string, context: RequestContext): Promise<Result<Lease, DomainError>> {
    if (!id) {
      return err(new ValidationError('Lease ID is required.'));
    }
    return this.repository.restore(id, context);
  }

  async deleteLease(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    if (!id) {
      return err(new ValidationError('Lease ID is required.'));
    }
    return this.repository.delete(id, context);
  }

  async renewLease(dto: RenewLeaseDTO, context: RequestContext): Promise<Result<Lease, DomainError>> {
    // 1. Authorization check
    const role = context.roleName?.toLowerCase();
    if (role && ['viewer', 'tenant'].includes(role)) {
      return err(new ForbiddenError('You do not have permission to renew this lease.'));
    }

    // 2. Input validation
    if (!dto.previousLeaseId) {
      return err(new ValidationError('Previous Lease ID is required.'));
    }
    if (!dto.propertyId) {
      return err(new ValidationError('Property ID is required.'));
    }
    if (!dto.startDate) {
      return err(new ValidationError('Start date is required.'));
    }
    if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      return err(new ValidationError('New end date must be on or after new start date.'));
    }
    if (dto.rentAmount === undefined || dto.rentAmount < 0) {
      return err(new ValidationError('Valid positive rent amount is required.'));
    }
    if (dto.securityDeposit !== undefined && dto.securityDeposit < 0) {
      return err(new ValidationError('Security deposit cannot be negative.'));
    }
    if (!dto.tenantAssignments || dto.tenantAssignments.length === 0) {
      return err(new ValidationError('At least one tenant must be assigned to the renewal lease.'));
    }

    // Ensure at least one tenant is primary
    const assignments = [...dto.tenantAssignments];
    const hasPrimary = assignments.some((a) => a.isPrimary);
    if (!hasPrimary && assignments.length > 0) {
      assignments[0] = { ...assignments[0], isPrimary: true, role: 'primary' };
    }

    return this.repository.renewLease(
      dto.previousLeaseId,
      {
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        rentAmount: dto.rentAmount,
        securityDeposit: dto.securityDeposit ?? 0,
        paymentDueDay: dto.paymentDueDay ?? 1,
        rentFrequency: dto.rentFrequency ?? 'monthly',
        notes: dto.notes,
        tenantAssignments: assignments,
      },
      context
    );
  }

  async getRenewalHistory(leaseId: string, context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    if (!leaseId) {
      return err(new ValidationError('Lease ID is required.'));
    }
    return this.repository.getRenewalHistory(leaseId, context);
  }

  async getLeaseTenants(leaseId: string, context?: RequestContext): Promise<Result<LeaseTenantAssignment[], DomainError>> {
    if (!leaseId) {
      return err(new ValidationError('Lease ID is required.'));
    }
    return this.repository.getLeaseTenants(leaseId, context);
  }
}
