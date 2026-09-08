/**
 * Tenant Data Mapper.
 */

import { Database } from '@/types/database';
import { Tenant } from '../../domain/entities/tenant';
import { CreateTenantData, UpdateTenantData } from '../../domain/repositories/tenant-repository';

type TenantRow = Database['public']['Tables']['tenants']['Row'];
type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export function mapTenantRowToDomain(row: TenantRow): Tenant {
  return {
    id: row.id,
    propertyId: row.property_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    status: row.status,
    dateOfBirth: row.date_of_birth,
    emergencyContact: {
      name: row.emergency_contact_name,
      phone: row.emergency_contact_phone,
    },
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreateTenantDataToRow(data: CreateTenantData): TenantInsert {
  return {
    property_id: data.propertyId,
    user_id: data.userId || null,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone || null,
    date_of_birth: data.dateOfBirth || null,
    emergency_contact_name: data.emergencyContactName || null,
    emergency_contact_phone: data.emergencyContactPhone || null,
    notes: data.notes || null,
    status: data.status || 'active',
  };
}

export function mapUpdateTenantDataToRow(data: UpdateTenantData): TenantUpdate {
  const row: TenantUpdate = {};
  if (data.firstName !== undefined) row.first_name = data.firstName;
  if (data.lastName !== undefined) row.last_name = data.lastName;
  if (data.email !== undefined) row.email = data.email;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.status !== undefined) row.status = data.status;
  if (data.dateOfBirth !== undefined) row.date_of_birth = data.dateOfBirth;
  if (data.emergencyContactName !== undefined) row.emergency_contact_name = data.emergencyContactName;
  if (data.emergencyContactPhone !== undefined) row.emergency_contact_phone = data.emergencyContactPhone;
  if (data.notes !== undefined) row.notes = data.notes;
  row.updated_at = new Date().toISOString();
  return row;
}
