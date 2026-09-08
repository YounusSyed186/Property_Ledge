/**
 * Lease Domain Entity and Value Objects.
 * Pure domain representation - zero Supabase dependencies.
 */

export type LeaseStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'cancelled' | 'renewed';
export type RentFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
export type LeaseTenantRole = 'primary' | 'co-tenant' | 'guarantor';

export interface LeaseTenantAssignment {
  tenantId: string;
  role: LeaseTenantRole;
  isPrimary: boolean;
  tenantName?: string;
  tenantEmail?: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  unitId?: string | null;
  status: LeaseStatus;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  securityDeposit: number;
  paymentDueDay: number;
  rentFrequency: RentFrequency;
  notes?: string | null;
  createdBy?: string | null;
  renewedFromLeaseId?: string | null;
  tenants: LeaseTenantAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaseFilters {
  propertyId?: string;
  workspaceId?: string;
  status?: LeaseStatus | 'all';
  limit?: number;
  offset?: number;
}
