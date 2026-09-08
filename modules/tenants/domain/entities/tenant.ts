/**
 * Tenant Domain Entity.
 * Pure domain representation - zero Supabase dependencies.
 */

export type TenantStatus = 'active' | 'inactive' | 'archived' | 'prospect';

export interface EmergencyContact {
  name?: string | null;
  phone?: string | null;
}

export interface Tenant {
  id: string;
  propertyId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: TenantStatus;
  dateOfBirth?: string | null;
  emergencyContact: EmergencyContact;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFilters {
  propertyId?: string;
  workspaceId?: string;
  status?: TenantStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}
