/**
 * Property Application Data Transfer Objects (DTOs).
 */

import { Property, PropertyStatus, PropertyCategory } from '../../domain/entities/property';

export interface CreatePropertyDTO {
  workspaceId: string;
  name: string;
  propertyType?: string | null;
  propertyCategory?: PropertyCategory | null;
  address: string;
  suburb?: string | null;
  state?: string;
  postcode?: string;
  country?: string;
  carSpaces?: number;
  imageUrl?: string | null;
  rentAmount?: number | null;
  paymentFrequency?: string | null;
  customPropertyCode?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  description?: string | null;
  notes?: string | null;
}

export interface UpdatePropertyDTO extends Partial<CreatePropertyDTO> {
  status?: PropertyStatus;
}

export interface PropertyListItemDTO {
  id: string;
  name: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  status: PropertyStatus;
  imageUrl: string | null;
  propertyCategory: PropertyCategory | null;
  rentAmount: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
}

export function toPropertyListItemDTO(prop: Property): PropertyListItemDTO {
  return {
    id: prop.id,
    name: prop.name,
    address: prop.address.addressLine1,
    suburb: prop.address.suburb || prop.address.city,
    state: prop.address.state,
    postcode: prop.address.postalCode,
    status: prop.status,
    imageUrl: prop.imageUrl || null,
    propertyCategory: prop.propertyCategory || null,
    rentAmount: prop.rentAmount ?? null,
    bedrooms: prop.bedrooms ?? null,
    bathrooms: prop.bathrooms ?? null,
    carSpaces: prop.parkingSpaces ?? null,
  };
}
