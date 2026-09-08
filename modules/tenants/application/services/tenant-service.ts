/**
 * Tenant Application Service.
 * Pure Application Layer - ZERO Supabase imports.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, ValidationError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Tenant, TenantFilters } from '../../domain/entities/tenant';
import { TenantRepository } from '../../domain/repositories/tenant-repository';
import { CreateTenantDTO, UpdateTenantDTO } from '../dto/tenant-dto';

export class TenantService {
  constructor(private readonly repository: TenantRepository) {}

  async getTenant(id: string, context?: RequestContext): Promise<Result<Tenant, DomainError>> {
    if (!id) {
      return err(new ValidationError('Tenant ID is required.'));
    }
    return this.repository.getById(id, context);
  }

  async listTenantsByProperty(propertyId: string, context?: RequestContext): Promise<Result<Tenant[], DomainError>> {
    if (!propertyId) {
      return err(new ValidationError('Property ID is required.'));
    }
    return this.repository.listByProperty(propertyId, context);
  }

  async listTenantsByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<Tenant[], DomainError>> {
    if (!workspaceId) {
      return err(new ValidationError('Workspace ID is required.'));
    }
    return this.repository.listByWorkspace(workspaceId, context);
  }

  async listTenants(filters: TenantFilters = {}, context?: RequestContext): Promise<Result<Tenant[], DomainError>> {
    return this.repository.list(filters, context);
  }

  async createTenant(dto: CreateTenantDTO, context: RequestContext): Promise<Result<Tenant, DomainError>> {
    if (!dto.propertyId) {
      return err(new ValidationError('Property ID is required.'));
    }
    if (!dto.firstName || !dto.firstName.trim()) {
      return err(new ValidationError('First name is required.'));
    }
    if (!dto.lastName || !dto.lastName.trim()) {
      return err(new ValidationError('Last name is required.'));
    }
    if (!dto.email || !dto.email.trim()) {
      return err(new ValidationError('Email is required.'));
    }

    return this.repository.create(
      {
        propertyId: dto.propertyId,
        userId: dto.userId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        dateOfBirth: dto.dateOfBirth || null,
        emergencyContactName: dto.emergencyContactName?.trim() || null,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      context
    );
  }

  async updateTenant(
    id: string,
    dto: UpdateTenantDTO,
    context: RequestContext
  ): Promise<Result<Tenant, DomainError>> {
    if (!id) {
      return err(new ValidationError('Tenant ID is required.'));
    }

    const updateData: Record<string, unknown> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName.trim();
    if (dto.email !== undefined) updateData.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null;
    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = dto.dateOfBirth;
    if (dto.emergencyContactName !== undefined) updateData.emergencyContactName = dto.emergencyContactName?.trim() || null;
    if (dto.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = dto.emergencyContactPhone?.trim() || null;
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.repository.update(id, updateData, context);
  }

  async archiveTenant(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    if (!id) {
      return err(new ValidationError('Tenant ID is required.'));
    }
    return this.repository.archive(id, context);
  }

  async restoreTenant(id: string, context: RequestContext): Promise<Result<Tenant, DomainError>> {
    if (!id) {
      return err(new ValidationError('Tenant ID is required.'));
    }
    return this.repository.restore(id, context);
  }

  async deleteTenant(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    if (!id) {
      return err(new ValidationError('Tenant ID is required.'));
    }
    return this.repository.delete(id, context);
  }
}
