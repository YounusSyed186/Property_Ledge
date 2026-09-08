/**
 * Property Application Service.
 * Orchestrates business operations and enforces validation rules.
 * Pure Application Layer - ZERO Supabase imports.
 */

import { Result, ok, err, isErr } from '@/shared/domain/result';
import { DomainError, ValidationError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Property, PropertyFilters } from '../../domain/entities/property';
import { PropertyRepository } from '../../domain/repositories/property-repository';
import { CreatePropertyDTO, UpdatePropertyDTO } from '../dto/property-dto';

export class PropertyService {
  constructor(private readonly repository: PropertyRepository) {}

  async getProperty(id: string, context?: RequestContext): Promise<Result<Property, DomainError>> {
    if (!id || typeof id !== 'string') {
      return err(new ValidationError('Property ID is required.'));
    }
    return this.repository.getById(id, context);
  }

  async listProperties(filters: PropertyFilters = {}, context?: RequestContext): Promise<Result<Property[], DomainError>> {
    return this.repository.list(filters, context);
  }

  async getWorkspacePropertyCount(workspaceId: string, context?: RequestContext): Promise<Result<number, DomainError>> {
    if (!workspaceId) {
      return err(new ValidationError('Workspace ID is required.'));
    }
    return this.repository.countByWorkspace(workspaceId, context);
  }

  async createProperty(dto: CreatePropertyDTO, context: RequestContext): Promise<Result<Property, DomainError>> {
    if (!context || !context.userId) {
      return err(new ValidationError('User context is required to create a property.'));
    }

    if (!dto.workspaceId) {
      return err(new ValidationError('Workspace ID is required to create a property.'));
    }

    if (!dto.name && !dto.address) {
      return err(new ValidationError('Property name or address is required.'));
    }

    const name = dto.name?.trim() || dto.address.trim();

    return this.repository.create(
      {
        workspaceId: dto.workspaceId,
        name,
        propertyType: dto.propertyType,
        propertyCategory: dto.propertyCategory,
        addressLine1: dto.address,
        suburb: dto.suburb,
        city: dto.suburb || 'Melbourne',
        state: dto.state || 'VIC',
        postalCode: dto.postcode || '3000',
        country: dto.country || 'Australia',
        parkingSpaces: dto.carSpaces,
        imageUrl: dto.imageUrl,
        rentAmount: dto.rentAmount,
        paymentFrequency: dto.paymentFrequency,
        customPropertyCode: dto.customPropertyCode,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        description: dto.description,
        notes: dto.notes,
      },
      context
    );
  }

  async updateProperty(
    id: string,
    dto: UpdatePropertyDTO,
    context: RequestContext
  ): Promise<Result<Property, DomainError>> {
    if (!id) {
      return err(new ValidationError('Property ID is required.'));
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.address !== undefined) updateData.addressLine1 = dto.address.trim();
    if (dto.suburb !== undefined) {
      updateData.suburb = dto.suburb;
      updateData.city = dto.suburb;
    }
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postcode !== undefined) updateData.postalCode = dto.postcode;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.carSpaces !== undefined) updateData.parkingSpaces = dto.carSpaces;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.rentAmount !== undefined) updateData.rentAmount = dto.rentAmount;
    if (dto.paymentFrequency !== undefined) updateData.paymentFrequency = dto.paymentFrequency;
    if (dto.bedrooms !== undefined) updateData.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) updateData.bathrooms = dto.bathrooms;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.repository.update(id, updateData, context);
  }

  async archiveProperty(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    if (!id) {
      return err(new ValidationError('Property ID is required.'));
    }
    return this.repository.archive(id, context);
  }

  async restoreProperty(id: string, context: RequestContext): Promise<Result<Property, DomainError>> {
    if (!id) {
      return err(new ValidationError('Property ID is required.'));
    }
    return this.repository.restore(id, context);
  }

  async deleteProperty(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    if (!id) {
      return err(new ValidationError('Property ID is required.'));
    }
    return this.repository.delete(id, context);
  }
}
