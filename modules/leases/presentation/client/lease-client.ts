/**
 * Lease Client Interface for presentation layers.
 */

import { Lease, LeaseFilters, LeaseTenantAssignment } from '../../domain/entities/lease';
import { CreateLeaseDTO, UpdateLeaseDTO } from '../../application/dto/lease-dto';

export interface LeaseClient {
  list(filters?: LeaseFilters): Promise<Lease[]>;
  get(id: string): Promise<Lease>;
  create(dto: CreateLeaseDTO): Promise<Lease>;
  update(id: string, dto: UpdateLeaseDTO): Promise<Lease>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<Lease>;
  delete(id: string): Promise<void>;
  getLeaseTenants(leaseId: string): Promise<LeaseTenantAssignment[]>;
}
