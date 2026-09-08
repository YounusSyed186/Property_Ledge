/**
 * Supabase Implementation of LeaseRepository.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Lease, LeaseFilters, LeaseTenantAssignment } from '../../domain/entities/lease';
import {
  LeaseRepository,
  CreateLeaseData,
  UpdateLeaseData,
} from '../../domain/repositories/lease-repository';
import {
  mapLeaseRowToDomain,
  mapCreateLeaseDataToRow,
  mapUpdateLeaseDataToRow,
} from '../mappers/lease-mapper';

export class SupabaseLeaseRepository implements LeaseRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return err(new NotFoundError('Lease', id));
      }

      const tenantsRes = await this.getLeaseTenants(id);
      const tenants = tenantsRes.success ? tenantsRes.data : [];

      return ok(mapLeaseRowToDomain(data, tenants));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByProperty(propertyId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map((row) => mapLeaseRowToDomain(row, [])));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByWorkspace(workspaceId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .select(`
          *,
          properties!inner (
            id,
            name,
            workspace_id
          )
        `)
        .eq('properties.workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map((row) => mapLeaseRowToDomain(row as never, [])));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async list(filters: LeaseFilters, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      let query = this.client
        .from('leases')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map((row) => mapLeaseRowToDomain(row, [])));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async create(data: CreateLeaseData, context: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const row = mapCreateLeaseDataToRow(data, context.userId);
      const { data: created, error } = await this.client
        .from('leases')
        .insert(row as never)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      const leaseId = (created as { id: string }).id;

      // Assign tenants if provided
      const tenantAssignments: LeaseTenantAssignment[] = [];
      if (data.tenantAssignments && data.tenantAssignments.length > 0) {
        for (const assign of data.tenantAssignments) {
          await this.client.from('lease_tenants').insert({
            lease_id: leaseId,
            tenant_id: assign.tenantId,
            property_id: data.propertyId,
            role: assign.role || 'primary',
            is_primary: assign.isPrimary ?? false,
          } as never);

          tenantAssignments.push({
            tenantId: assign.tenantId,
            role: assign.role || 'primary',
            isPrimary: assign.isPrimary ?? false,
          });
        }
      }

      return ok(mapLeaseRowToDomain(created, tenantAssignments));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(id: string, data: UpdateLeaseData, _context: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const row = mapUpdateLeaseDataToRow(data);
      const { data: updated, error } = await this.client
        .from('leases')
        .update(row as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      // Update tenant assignments if provided
      if (data.tenantAssignments) {
        await this.client.from('lease_tenants').delete().eq('lease_id', id);
        for (const assign of data.tenantAssignments) {
          await this.client.from('lease_tenants').insert({
            lease_id: id,
            tenant_id: assign.tenantId,
            property_id: (updated as { property_id: string }).property_id,
            role: assign.role || 'primary',
            is_primary: assign.isPrimary ?? false,
          } as never);
        }
      }

      const tenantsRes = await this.getLeaseTenants(id);
      const tenants = tenantsRes.success ? tenantsRes.data : [];

      return ok(mapLeaseRowToDomain(updated, tenants));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async archive(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client
        .from('leases')
        .update({ status: 'terminated', updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async restore(id: string, _context: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .update({ status: 'active', updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      const tenantsRes = await this.getLeaseTenants(id);
      const tenants = tenantsRes.success ? tenantsRes.data : [];

      return ok(mapLeaseRowToDomain(data, tenants));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async delete(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      await this.client.from('lease_tenants').delete().eq('lease_id', id);
      const { error } = await this.client.from('leases').delete().eq('id', id);
      if (error) {
        return err(toSafeDomainError(error));
      }
      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getLeaseTenants(leaseId: string, _context?: RequestContext): Promise<Result<LeaseTenantAssignment[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('lease_tenants')
        .select(`
          tenant_id,
          role,
          is_primary,
          tenants (
            first_name,
            last_name,
            email
          )
        `)
        .eq('lease_id', leaseId);

      if (error) {
        return err(toSafeDomainError(error));
      }

      const mapped: LeaseTenantAssignment[] = (data || []).map((row: any) => ({
        tenantId: row.tenant_id,
        role: row.role,
        isPrimary: row.is_primary,
        tenantName: row.tenants ? `${row.tenants.first_name} ${row.tenants.last_name}`.trim() : undefined,
        tenantEmail: row.tenants?.email || undefined,
      }));

      return ok(mapped);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
