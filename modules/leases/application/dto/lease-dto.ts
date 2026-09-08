/**
 * Lease Application DTOs.
 */

import { Lease, LeaseStatus, RentFrequency } from '../../domain/entities/lease';

export interface CreateLeaseDTO {
  propertyId: string;
  unitId?: string | null;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  securityDeposit?: number;
  paymentDueDay?: number;
  rentFrequency?: RentFrequency;
  notes?: string | null;
  tenantIds?: string[];
}

export interface UpdateLeaseDTO extends Partial<Omit<CreateLeaseDTO, 'propertyId'>> {
  status?: LeaseStatus;
}

export interface RenewLeaseDTO {
  previousLeaseId: string;
  propertyId: string;
  unitId?: string | null;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  securityDeposit?: number;
  paymentDueDay?: number;
  rentFrequency?: RentFrequency;
  notes?: string | null;
  tenantAssignments: Array<{
    tenantId: string;
    role?: 'primary' | 'co-tenant' | 'guarantor';
    isPrimary?: boolean;
  }>;
}

export interface LeaseListItemDTO {
  id: string;
  propertyId: string;
  unitId: string | null;
  status: LeaseStatus;
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  rentFrequency: RentFrequency;
  paymentDueDay: number;
  notes: string | null;
  tenantsCount: number;
  createdAt: string;
}

export function toLeaseListItemDTO(l: Lease): LeaseListItemDTO {
  return {
    id: l.id,
    propertyId: l.propertyId,
    unitId: l.unitId || null,
    status: l.status,
    startDate: l.startDate,
    endDate: l.endDate || null,
    rentAmount: l.rentAmount,
    rentFrequency: l.rentFrequency,
    paymentDueDay: l.paymentDueDay,
    notes: l.notes || null,
    tenantsCount: l.tenants.length,
    createdAt: l.createdAt,
  };
}
