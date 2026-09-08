/**
 * Lease Data Mapper.
 */

import { Database } from '@/types/database';
import { Lease, LeaseTenantAssignment } from '../../domain/entities/lease';
import { CreateLeaseData, UpdateLeaseData } from '../../domain/repositories/lease-repository';

type LeaseRow = Database['public']['Tables']['leases']['Row'];
type LeaseInsert = Database['public']['Tables']['leases']['Insert'];
type LeaseUpdate = Database['public']['Tables']['leases']['Update'];

export function mapLeaseRowToDomain(row: LeaseRow, tenants: LeaseTenantAssignment[] = []): Lease {
  return {
    id: row.id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    rentAmount: row.rent_amount,
    securityDeposit: row.security_deposit,
    paymentDueDay: row.payment_due_day,
    rentFrequency: row.rent_frequency,
    notes: row.notes,
    createdBy: row.created_by,
    renewedFromLeaseId: row.renewed_from_lease_id,
    tenants,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreateLeaseDataToRow(data: CreateLeaseData, createdBy: string): LeaseInsert {
  return {
    property_id: data.propertyId,
    unit_id: data.unitId || null,
    start_date: data.startDate,
    end_date: data.endDate || null,
    rent_amount: data.rentAmount,
    security_deposit: data.securityDeposit ?? 0,
    payment_due_day: data.paymentDueDay ?? 1,
    rent_frequency: data.rentFrequency || 'monthly',
    notes: data.notes || null,
    status: data.status || 'active',
    renewed_from_lease_id: data.renewedFromLeaseId || null,
    created_by: createdBy,
  };
}

export function mapUpdateLeaseDataToRow(data: UpdateLeaseData): LeaseUpdate {
  const row: LeaseUpdate = {};
  if (data.unitId !== undefined) row.unit_id = data.unitId;
  if (data.startDate !== undefined) row.start_date = data.startDate;
  if (data.endDate !== undefined) row.end_date = data.endDate;
  if (data.rentAmount !== undefined) row.rent_amount = data.rentAmount;
  if (data.securityDeposit !== undefined) row.security_deposit = data.securityDeposit;
  if (data.paymentDueDay !== undefined) row.payment_due_day = data.paymentDueDay;
  if (data.rentFrequency !== undefined) row.rent_frequency = data.rentFrequency;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.status !== undefined) row.status = data.status;
  row.updated_at = new Date().toISOString();
  return row;
}
