/**
 * Property Repository Interface.
 * Defines persistence contract for Properties without mentioning database or Supabase.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Property, PropertyFilters } from '../entities/property';

export interface CreatePropertyData {
  workspaceId: string;
  name: string;
  propertyType?: string | null;
  propertyCategory?: 'Residential' | 'Commercial' | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  suburb?: string | null;
  state?: string;
  postalCode?: string;
  country?: string;
  parkingSpaces?: number | null;
  imageUrl?: string | null;
  rentAmount?: number | null;
  paymentFrequency?: string | null;
  customPropertyCode?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  description?: string | null;
  notes?: string | null;
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {
  status?: Property['status'];
}

export interface PropertyRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Property, DomainError>>;
  list(filters: PropertyFilters, context?: RequestContext): Promise<Result<Property[], DomainError>>;
  countByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<number, DomainError>>;
  create(data: CreatePropertyData, context: RequestContext): Promise<Result<Property, DomainError>>;
  update(id: string, data: UpdatePropertyData, context: RequestContext): Promise<Result<Property, DomainError>>;
  archive(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
  restore(id: string, context: RequestContext): Promise<Result<Property, DomainError>>;
  delete(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
}
