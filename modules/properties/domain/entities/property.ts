/**
 * Property Domain Entity and Value Objects.
 * Pure business representation - zero Supabase / database imports.
 */

export type PropertyStatus = 'active' | 'archived' | 'maintenance';
export type PropertyCategory = 'Residential' | 'Commercial';

export interface PropertyAddress {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  suburb?: string | null;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Property {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  propertyType?: string | null;
  propertyCategory?: PropertyCategory | null;
  status: PropertyStatus;
  address: PropertyAddress;
  description?: string | null;
  imageUrl?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  rentAmount?: number | null;
  paymentFrequency?: string | null;
  customPropertyCode?: string | null;
  tenantName?: string | null;
  tenantEmail?: string | null;
  leaseStart?: string | null;
  leaseDuration?: string | null;
  squareFeet?: number | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  workspaceId?: string;
  status?: PropertyStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}
