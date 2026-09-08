/**
 * Tenant Client Interface for presentation layers.
 */

import { Tenant, TenantFilters } from '../../domain/entities/tenant';
import { CreateTenantDTO, UpdateTenantDTO } from '../../application/dto/tenant-dto';

export interface TenantClient {
  list(filters?: TenantFilters): Promise<Tenant[]>;
  get(id: string): Promise<Tenant>;
  create(dto: CreateTenantDTO): Promise<Tenant>;
  update(id: string, dto: UpdateTenantDTO): Promise<Tenant>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<Tenant>;
  delete(id: string): Promise<void>;
}
