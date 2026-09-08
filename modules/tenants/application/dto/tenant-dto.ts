/**
 * Tenant Application DTOs.
 */

import { Tenant, TenantStatus } from '../../domain/entities/tenant';

export interface CreateTenantDTO {
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
}

export interface UpdateTenantDTO extends Partial<Omit<CreateTenantDTO, 'propertyId'>> {
  status?: TenantStatus;
}

export interface TenantListItemDTO {
  id: string;
  propertyId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: TenantStatus;
  notes: string | null;
  createdAt: string;
}

export function toTenantListItemDTO(t: Tenant): TenantListItemDTO {
  return {
    id: t.id,
    propertyId: t.propertyId,
    fullName: t.fullName,
    firstName: t.firstName,
    lastName: t.lastName,
    email: t.email,
    phone: t.phone || null,
    status: t.status,
    notes: t.notes || null,
    createdAt: t.createdAt,
  };
}
