/**
 * Supabase Implementation of TenantRepository.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Tenant, TenantFilters } from '../../domain/entities/tenant';
import {
  TenantRepository,
  CreateTenantData,
  UpdateTenantData,
} from '../../domain/repositories/tenant-repository';
import {
  mapTenantRowToDomain,
  mapCreateTenantDataToRow,
  mapUpdateTenantDataToRow,
} from '../mappers/tenant-mapper';

export class SupabaseTenantRepository implements TenantRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<Tenant, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('tenants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return err(new NotFoundError('Tenant', id));
      }

      return ok(mapTenantRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByProperty(propertyId: string, _context?: RequestContext): Promise<Result<Tenant[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('tenants')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map(mapTenantRowToDomain));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByWorkspace(workspaceId: string, _context?: RequestContext): Promise<Result<Tenant[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('tenants')
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

      return ok((data || []).map((row) => mapTenantRowToDomain(row as never)));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async list(filters: TenantFilters, _context?: RequestContext): Promise<Result<Tenant[], DomainError>> {
    try {
      let query = this.client
        .from('tenants')
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

      return ok((data || []).map(mapTenantRowToDomain));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async create(data: CreateTenantData, _context: RequestContext): Promise<Result<Tenant, DomainError>> {
    try {
      const row = mapCreateTenantDataToRow(data);
      const { data: created, error } = await this.client
        .from('tenants')
        .insert(row as never)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapTenantRowToDomain(created));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(id: string, data: UpdateTenantData, _context: RequestContext): Promise<Result<Tenant, DomainError>> {
    try {
      const row = mapUpdateTenantDataToRow(data);
      const { data: updated, error } = await this.client
        .from('tenants')
        .update(row as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapTenantRowToDomain(updated));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async archive(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client
        .from('tenants')
        .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async restore(id: string, _context: RequestContext): Promise<Result<Tenant, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('tenants')
        .update({ status: 'active', updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapTenantRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async delete(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      // Remove junction references
      await this.client.from('lease_tenants').delete().eq('tenant_id', id);

      const { error } = await this.client
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
