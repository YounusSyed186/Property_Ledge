/**
 * Property Data Mapper.
 * Converts between Database row representations and Domain entities.
 */

import { Database } from '@/types/database';
import { Property } from '../../domain/entities/property';
import { CreatePropertyData, UpdatePropertyData } from '../../domain/repositories/property-repository';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export function mapPropertyRowToDomain(row: PropertyRow): Property {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    name: row.name,
    propertyType: row.property_type,
    propertyCategory: row.property_category,
    status: row.status,
    address: {
      addressLine1: row.address_line_1,
      addressLine2: row.address_line_2,
      city: row.city,
      suburb: row.suburb,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    description: row.description,
    imageUrl: row.image_url,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parkingSpaces: row.parking_spaces ?? row.car_spaces,
    rentAmount: row.rent_amount,
    paymentFrequency: row.payment_frequency,
    customPropertyCode: row.property_id,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    leaseStart: row.lease_start,
    leaseDuration: row.lease_duration,
    squareFeet: row.square_feet,
    purchasePrice: row.purchase_price,
    purchaseDate: row.purchase_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreateDataToRow(data: CreatePropertyData, ownerId: string): PropertyInsert {
  return {
    workspace_id: data.workspaceId,
    owner_id: ownerId,
    name: data.name,
    property_type: data.propertyType || null,
    property_category: data.propertyCategory || null,
    address_line_1: data.addressLine1,
    address_line_2: data.addressLine2 || null,
    city: data.city,
    suburb: data.suburb || null,
    state: data.state || 'VIC',
    postal_code: data.postalCode || '3000',
    country: data.country || 'Australia',
    parking_spaces: data.parkingSpaces ?? null,
    image_url: data.imageUrl || null,
    rent_amount: data.rentAmount ?? null,
    payment_frequency: data.paymentFrequency || null,
    property_id: data.customPropertyCode || `PL-${Math.floor(1000 + Math.random() * 9000)}`,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    description: data.description || null,
    notes: data.notes || null,
    status: 'active',
  };
}

export function mapUpdateDataToRow(data: UpdatePropertyData): PropertyUpdate {
  const row: PropertyUpdate = {};

  if (data.name !== undefined) row.name = data.name;
  if (data.propertyType !== undefined) row.property_type = data.propertyType;
  if (data.propertyCategory !== undefined) row.property_category = data.propertyCategory;
  if (data.addressLine1 !== undefined) row.address_line_1 = data.addressLine1;
  if (data.addressLine2 !== undefined) row.address_line_2 = data.addressLine2;
  if (data.city !== undefined) row.city = data.city;
  if (data.suburb !== undefined) row.suburb = data.suburb;
  if (data.state !== undefined) row.state = data.state;
  if (data.postalCode !== undefined) row.postal_code = data.postalCode;
  if (data.country !== undefined) row.country = data.country;
  if (data.parkingSpaces !== undefined) row.parking_spaces = data.parkingSpaces;
  if (data.imageUrl !== undefined) row.image_url = data.imageUrl;
  if (data.rentAmount !== undefined) row.rent_amount = data.rentAmount;
  if (data.paymentFrequency !== undefined) row.payment_frequency = data.paymentFrequency;
  if (data.customPropertyCode !== undefined) row.property_id = data.customPropertyCode;
  if (data.bedrooms !== undefined) row.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) row.bathrooms = data.bathrooms;
  if (data.description !== undefined) row.description = data.description;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.status !== undefined) row.status = data.status;

  row.updated_at = new Date().toISOString();
  return row;
}
